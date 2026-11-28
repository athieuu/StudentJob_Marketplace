import { strict as assert } from "node:assert";
import { test } from "node:test";
import { loginRedirect } from "../src/loginRedirect.ts";

for (const [role, home, own, other] of [
  ["STUDENT", "/", "/student/profile", "/admin/users"],
  ["EMPLOYER", "/employer/dashboard", "/employer/jobs", "/student/profile"],
  ["ADMIN", "/admin/dashboard", "/admin/users", "/employer/jobs"],
] as const) {
  test(`${role} return paths`, () => {
    assert.equal(loginRedirect(role, undefined), home);
    assert.equal(loginRedirect(role, other), home);
    assert.equal(loginRedirect(role, `${own}?tab=1#section`), `${own}?tab=1#section`);
    assert.equal(loginRedirect(role, "/jobs/42?source=search"), "/jobs/42?source=search");
    for (const unsafe of ["https://evil.example/", "//evil.example/", "/\\evil.example", "/\n/evil.example", "/jobs/../admin/users"]) {
      assert.equal(loginRedirect(role, unsafe), home);
    }
  });
}
