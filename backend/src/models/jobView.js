// Only these fields may leave the service; internal import metadata stays private.
const fields = ['id', 'employer_id', 'title', 'description', 'location', 'salary_min', 'salary_max', 'job_type', 'deadline', 'status', 'moderation_status', 'rejection_reason', 'created_at', 'updated_at', 'category', 'work_mode', 'responsibilities', 'requirements', 'skills', 'company_name', 'employer_user_id', 'employer_email'];
module.exports = row => Object.fromEntries(fields.filter(field => Object.hasOwn(row, field)).map(field => [field, row[field]]));
