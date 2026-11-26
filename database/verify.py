"""Destructive verification ONLY for a new uniquely named disposable demo project.

Usage: python database/verify.py --project sjdb-verify-<unique-suffix>
Requires Docker Compose and Python standard library; no dependency installs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--project', required=True)
args = parser.parse_args()
if not re.fullmatch(r'sjdb-verify-[a-z0-9-]+', args.project):
    raise SystemExit('Project must start sjdb-verify- and contain lowercase letters/digits/hyphens')
compose = ['docker', 'compose', '-p', args.project, '-f', str(ROOT / 'docker-compose.yml')]
log = []

def run(cmd, expected_error=None):
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    output = result.stdout + result.stderr
    excerpt = output if len(output) <= 12000 else output[:1000] + '\n[long output excerpted]\n' + output[-6000:]
    log.append('$ ' + subprocess.list2cmdline(cmd) + '\n' + excerpt + f'\nexit={result.returncode}\n')
    if expected_error:
        assert result.returncode != 0 and expected_error in output, output
    elif result.returncode:
        raise RuntimeError(output)
    return result.stdout.strip()

def sql(query, expected_error=None):
    return run(compose + ['exec', '-T', '-e', 'MYSQL_PWD=demo-only', 'mysql',
                          'mysql', '--default-character-set=utf8mb4', '-ustudentjob_demo',
                          '-N', '-B', 'studentjob_marketplace', '-e', query], expected_error)

tables = sorted('users student_profiles employer_profiles jobs applications email_verifications cvs conversations messages skills student_skills job_skills cv_parse_results job_match_scores reviews'.split())

def snapshot():
    assert sql('SHOW TABLES').splitlines() == tables
    assert sql("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND engine='InnoDB' AND table_collation='utf8mb4_unicode_ci'") == '15'
    assert sql("SELECT COUNT(*) FROM jobs WHERE status='OPEN' AND moderation_status='APPROVED'") == '2'
    assert sql('SELECT COUNT(*) FROM information_schema.referential_constraints WHERE constraint_schema=DATABASE()') == '22'
    assert sql("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='student_profiles' AND column_name='cv_url'") == '1'
    # Compare every legacy column, not just the subset used by the application.
    legacy = (ROOT / 'schema.sql').read_text(encoding='utf-8')
    for table, body in re.findall(r'CREATE TABLE `(\w+)` \((.*?)\) ENGINE', legacy, re.S):
        old = set(re.findall(r'^  `(\w+)`', body, re.M))
        actual = {line.split('\t')[0] for line in sql(f'SHOW COLUMNS FROM `{table}`').splitlines()}
        assert old <= actual, (table, old - actual)
    ddl = '\n'.join(sql(f'SHOW CREATE TABLE `{table}`') for table in tables)
    # Runtime timestamps vary; compare all other seeded values and schema exactly.
    rows = {}
    for table in tables:
        columns = [line.split('\t')[0] for line in sql(f'SHOW COLUMNS FROM `{table}`').splitlines()]
        columns = [c for c in columns if c not in ('created_at', 'updated_at', 'applied_at')]
        rows[table] = sql('SELECT ' + ','.join('`'+c+'`' for c in columns) + f' FROM `{table}` ORDER BY 1,2')
    return ddl, rows

try:
    # Refuse existing resources, even resources from an earlier verification run.
    assert not run(['docker', 'volume', 'ls', '-q', '--filter', f'label=com.docker.compose.project={args.project}'])
    assert not run(['docker', 'ps', '-aq', '--filter', f'label=com.docker.compose.project={args.project}'])
    assert not run(['docker', 'volume', 'ls', '-q', '--filter', f'name=^{args.project}_demo-data$'])
    run(compose + ['config', '--quiet'])
    run(compose + ['up', '-d', '--wait', '--wait-timeout', '240'])
    first = snapshot()
    sql('SELECT id,title,status,moderation_status FROM jobs ORDER BY id')
    sql('INSERT INTO applications(job_id,student_id) VALUES(1,1)', 'ERROR 1062')
    sql("INSERT INTO messages(conversation_id,sender_id,content) VALUES(999999,1,'orphan')", 'ERROR 1452')
    sql("INSERT INTO job_match_scores(student_id,job_id,score,method,score_version) VALUES(1,1,101,'skill_overlap','v1')", 'ERROR 3819')
    # Successful contract operations and delete behavior, rolled back to preserve seed.
    assert sql("START TRANSACTION; INSERT INTO conversations(student_id,employer_id) VALUES(1,1) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id); INSERT INTO conversations(student_id,employer_id) VALUES(1,1) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id); INSERT INTO messages(conversation_id,sender_id,content) VALUES(LAST_INSERT_ID(),1,'Demo message'); SELECT COUNT(*) FROM conversations; SELECT content FROM messages; DELETE FROM conversations; SELECT COUNT(*) FROM messages; DELETE FROM cvs WHERE id=1; SELECT cv_id IS NULL FROM applications WHERE id=1; ROLLBACK;") == '1\nDemo message\n0\n1'
    assert sql("START TRANSACTION; INSERT INTO cv_parse_results(user_id,cv_id,parser,status,extracted,expires_at) VALUES(1,1,'regex','success',JSON_OBJECT(),CURRENT_TIMESTAMP + INTERVAL 90 DAY); SELECT TIMESTAMPDIFF(DAY,created_at,expires_at) FROM cv_parse_results; UPDATE student_skills SET cv_parse_result_id=LAST_INSERT_ID() WHERE student_id=1; DELETE FROM cv_parse_results; SELECT COUNT(*) FROM student_skills WHERE cv_parse_result_id IS NOT NULL; ROLLBACK;") == '90\n0'
    sql("INSERT INTO cv_parse_results(user_id,parser,status,extracted) VALUES(1,'regex','failed',JSON_OBJECT())", 'ERROR 1364')
    assert sql("START TRANSACTION; INSERT INTO job_match_scores(student_id,job_id,score,method,score_version,explanation) VALUES(1,2,50,'skill_overlap','v1',JSON_OBJECT('matched',JSON_ARRAY(1),'missing',JSON_ARRAY(6),'required_missing',JSON_ARRAY(2))),(1,2,60,'skill_overlap','v2',JSON_OBJECT()); SELECT COUNT(*) FROM job_match_scores; ROLLBACK;") == '2'
    sql("START TRANSACTION; INSERT INTO job_match_scores(student_id,job_id,score,method,score_version) VALUES(1,2,50,'skill_overlap','v1'),(1,2,60,'skill_overlap','v1')", 'ERROR 1062')
    for query in ["SELECT * FROM jobs WHERE moderation_status='APPROVED' ORDER BY created_at DESC",
                  'SELECT * FROM cvs WHERE user_id=1 ORDER BY updated_at DESC',
                  'SELECT * FROM messages WHERE conversation_id=1 ORDER BY created_at,id',
                  'SELECT * FROM applications WHERE student_id=1 ORDER BY applied_at DESC',
                  "SELECT j.*,ep.company_name FROM jobs j LEFT JOIN employer_profiles ep ON j.employer_id=ep.id WHERE j.moderation_status='APPROVED' ORDER BY j.created_at DESC",
                  'SELECT a.id,j.title,sp.full_name,eu.email FROM applications a JOIN jobs j ON a.job_id=j.id JOIN student_profiles sp ON a.student_id=sp.id JOIN users su ON sp.user_id=su.id JOIN employer_profiles ep ON j.employer_id=ep.id JOIN users eu ON ep.user_id=eu.id ORDER BY a.applied_at DESC,a.id DESC']:
        sql('EXPLAIN ANALYZE ' + query)
    run(compose + ['logs', '--no-color', 'mysql'])
    # Only this invocation's newly created volume is authorized for removal.
    run(compose + ['down', '-v'])
    assert not run(['docker', 'volume', 'ls', '-q', '--filter', f'name=^{args.project}_demo-data$'])
    run(compose + ['up', '-d', '--wait', '--wait-timeout', '240'])
    second = snapshot()
    # Intentionally rejected inserts can advance auto_increment; first snapshot preceded them.
    assert first == second, 'Reinitialization schema/demo mismatch'
    digest = hashlib.sha256(json.dumps(first, sort_keys=True).encode()).hexdigest()
    log.append('PASS: both empty-volume initializations match (timestamps excluded); SHA256=' + digest)
    run(compose + ['down', '-v'])
    print(log[-2])
finally:
    transcript = '# Disposable MySQL verification\n\n```text\n' + '\n'.join(log) + '\n```\n'
    (ROOT / 'VERIFICATION.md').write_text('\n'.join(line.rstrip() for line in transcript.splitlines()) + '\n', encoding='utf-8')
