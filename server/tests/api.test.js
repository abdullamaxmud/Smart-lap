// End-to-end API tests. Runs against a separate database so real data is never touched:
//   npm test
// Requires a running MongoDB (TEST_MONGODB_URI, default mongodb://localhost:27017/hu_smart_lab_test).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('node:child_process');
const path = require('node:path');

const PORT = 5099;
const BASE = `http://localhost:${PORT}/api`;
const env = {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: 'test',
    MONGODB_URI: process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/hu_smart_lab_test',
    JWT_SECRET: 'test_secret'
};

let server;
const tokens = {};

const api = async (method, url, { token, body } = {}) => {
    const res = await fetch(BASE + url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });
    return { status: res.status, body: await res.json() };
};

before(async () => {
    const root = path.join(__dirname, '..');
    execFileSync(process.execPath, ['seeder.js'], { cwd: root, env, stdio: 'ignore' });

    server = spawn(process.execPath, ['index.js'], { cwd: root, env, stdio: 'ignore' });
    for (let i = 0; i < 50; i++) {
        try {
            const res = await fetch(`${BASE}/health`);
            if (res.ok && (await res.json()).database === 'connected') break;
        } catch { /* not up yet */ }
        await new Promise(r => setTimeout(r, 200));
    }

    for (const [key, email] of Object.entries({
        super: 'admin@hu.edu.so',
        admin: 'labadmin@hu.edu.so',
        tech: 'tech@hu.edu.so',
        tech2: 'tech2@hu.edu.so',
        student: 'student@hu.edu.so'
    })) {
        const { body } = await api('POST', '/auth/login', { body: { email, password: 'password123' } });
        tokens[key] = body.token;
        tokens[`${key}Id`] = body.user._id;
    }
});

after(() => server && server.kill());

test('health endpoint reports connected database', async () => {
    const { status, body } = await api('GET', '/health');
    assert.equal(status, 200);
    assert.equal(body.database, 'connected');
});

test('login rejects wrong password with a readable message', async () => {
    const { status, body } = await api('POST', '/auth/login', { body: { email: 'admin@hu.edu.so', password: 'nope' } });
    assert.equal(status, 401);
    assert.match(body.message, /invalid/i);
});

test('login is case-insensitive on email and returns full profile', async () => {
    const { status, body } = await api('POST', '/auth/login', { body: { email: 'Student@HU.edu.so', password: 'password123' } });
    assert.equal(status, 200);
    assert.equal(body.user.role, 'user');
    assert.equal(body.user.department.name, 'Computer Science');
    assert.equal(body.user.password, undefined);
});

test('updating a profile does not break the password (double-hash regression)', async () => {
    const upd = await api('PUT', '/auth/me', { token: tokens.student, body: { name: 'Test Student Updated' } });
    assert.equal(upd.status, 200);
    const login = await api('POST', '/auth/login', { body: { email: 'student@hu.edu.so', password: 'password123' } });
    assert.equal(login.status, 200);
    await api('PUT', '/auth/me', { token: tokens.student, body: { name: 'Test Student' } });
});

test('register always creates a regular user even if role is sent', async () => {
    const { status, body } = await api('POST', '/auth/register', {
        body: { name: 'Hacker', email: 'newuser@hu.edu.so', password: 'secret12', role: 'super_admin' }
    });
    assert.equal(status, 201);
    assert.equal(body.user.role, 'user');
});

test('register rejects duplicates and short passwords', async () => {
    const dup = await api('POST', '/auth/register', { body: { name: 'X', email: 'newuser@hu.edu.so', password: 'secret12' } });
    assert.equal(dup.status, 400);
    const short = await api('POST', '/auth/register', { body: { name: 'X', email: 'short@hu.edu.so', password: '123' } });
    assert.equal(short.status, 400);
});

test('change password requires the correct current password', async () => {
    const bad = await api('PATCH', '/auth/change-password', { token: tokens.tech2, body: { currentPassword: 'wrong', newPassword: 'newpass123' } });
    assert.equal(bad.status, 400);
    const ok = await api('PATCH', '/auth/change-password', { token: tokens.tech2, body: { currentPassword: 'password123', newPassword: 'newpass123' } });
    assert.equal(ok.status, 200);
    const login = await api('POST', '/auth/login', { body: { email: 'tech2@hu.edu.so', password: 'newpass123' } });
    assert.equal(login.status, 200);
    await api('PATCH', '/auth/change-password', { token: tokens.tech2, body: { currentPassword: 'newpass123', newPassword: 'password123' } });
});

test('protected routes reject missing or bad tokens', async () => {
    assert.equal((await api('GET', '/auth/me')).status, 401);
    assert.equal((await api('GET', '/auth/me', { token: 'garbage' })).status, 401);
});

test('query operator injection is ignored', async () => {
    const res = await fetch(`${BASE}/reports?status[$ne]=x&user[$ne]=y`, {
        headers: { Authorization: `Bearer ${tokens.student}` }
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(body.data.every(r => r.user._id === tokens.studentId));
});

let reportId;

test('student can create a report and lab must match faculty/department', async () => {
    const labs = (await api('GET', '/admin/labs')).body.data;
    const lab = labs.find(l => l.name === 'CS Lab A');
    const other = labs.find(l => l.name === 'Business Computer Lab');

    const mismatch = await api('POST', '/reports', {
        token: tokens.student,
        body: { faculty: other.faculty._id, department: other.department._id, lab: lab._id, computerNumber: 'X1', category: 'Hardware', description: 'test' }
    });
    assert.equal(mismatch.status, 400);

    const { status, body } = await api('POST', '/reports', {
        token: tokens.student,
        body: { faculty: lab.faculty._id, department: lab.department._id, lab: lab._id, computerNumber: 'CSA-99', category: 'Hardware', description: 'Mouse broken', status: 'Resolved', user: tokens.superId }
    });
    assert.equal(status, 201);
    assert.equal(body.data.status, 'Pending', 'client cannot set status on create');
    assert.equal(body.data.user._id, tokens.studentId, 'client cannot spoof reporter');
    reportId = body.data._id;
});

test('validation errors return a readable message', async () => {
    const lab = (await api('GET', '/admin/labs')).body.data[0];
    const { status, body } = await api('POST', '/reports', {
        token: tokens.student,
        body: { lab: lab._id, category: 'Nonsense', computerNumber: 'A', description: 'x' }
    });
    assert.equal(status, 400);
    assert.equal(typeof body.message, 'string');
    assert.ok(body.message.length > 0);
});

test('students only see their own reports and cannot update them', async () => {
    const { body } = await api('GET', '/reports', { token: tokens.student });
    assert.ok(body.data.every(r => r.user._id === tokens.studentId));
    const upd = await api('PUT', `/reports/${reportId}`, { token: tokens.student, body: { status: 'Resolved' } });
    assert.equal(upd.status, 403);
});

test('"mine" for an admin returns only reports they filed', async () => {
    const { body } = await api('GET', '/reports?mine=true', { token: tokens.super });
    assert.equal(body.total, 0);
    const all = await api('GET', '/reports', { token: tokens.super });
    assert.ok(all.body.total >= 9);
});

test('search, filters and pagination work', async () => {
    const search = await api('GET', '/reports?q=CSA-99', { token: tokens.super });
    assert.equal(search.body.total, 1);
    const byLab = await api('GET', '/reports?q=networking', { token: tokens.super });
    assert.equal(byLab.body.total, 2);
    const paged = await api('GET', '/reports?limit=3&page=2', { token: tokens.super });
    assert.equal(paged.body.count, 3);
    assert.equal(paged.body.page, 2);
    const network = await api('GET', '/reports?category=Network', { token: tokens.super });
    assert.ok(network.body.data.every(r => r.category === 'Network'));
});

test('admin can list assignees and assign a technician', async () => {
    const assignees = await api('GET', '/admin/assignees', { token: tokens.admin });
    assert.equal(assignees.status, 200);
    assert.ok(assignees.body.data.some(u => u._id === tokens.techId));

    const notStaff = await api('PUT', `/reports/${reportId}`, { token: tokens.admin, body: { assignedTo: tokens.studentId } });
    assert.equal(notStaff.status, 400);

    const { status, body } = await api('PUT', `/reports/${reportId}`, {
        token: tokens.admin,
        body: { assignedTo: tokens.techId, status: 'In Progress', priority: 'High' }
    });
    assert.equal(status, 200);
    assert.equal(body.data.assignedTo._id, tokens.techId);
    assert.equal(body.data.priority, 'High');
});

test('technicians only see their own and unassigned reports', async () => {
    const { body } = await api('GET', '/reports', { token: tokens.tech2 });
    assert.ok(body.data.every(r => !r.assignedTo || r.assignedTo._id === tokens.tech2Id));
    const blocked = await api('PUT', `/reports/${reportId}`, { token: tokens.tech2, body: { status: 'Resolved' } });
    assert.equal(blocked.status, 404);
});

test('technician can resolve an assigned report and resolvedAt is set', async () => {
    const { status, body } = await api('PUT', `/reports/${reportId}`, {
        token: tokens.tech,
        body: { status: 'Resolved', resolutionNotes: 'Replaced mouse' }
    });
    assert.equal(status, 200);
    assert.equal(body.data.status, 'Resolved');
    assert.ok(body.data.resolvedAt);

    const reassign = await api('PUT', `/reports/${reportId}`, { token: tokens.tech, body: { assignedTo: tokens.tech2Id } });
    assert.equal(reassign.status, 403);
});

test('technician claiming an unassigned report becomes the assignee', async () => {
    const pool = await api('GET', '/reports?assignedTo=unassigned&status=Pending', { token: tokens.tech2 });
    const target = pool.body.data[0];
    const { body } = await api('PUT', `/reports/${target._id}`, { token: tokens.tech2, body: { status: 'In Progress' } });
    assert.equal(body.data.assignedTo._id, tokens.tech2Id);
});

test('stats are role-scoped', async () => {
    const all = await api('GET', '/reports/stats', { token: tokens.super });
    assert.equal(all.status, 200);
    assert.equal(all.body.data.dailyStats.length, 30);
    assert.ok(all.body.data.totalIssues >= 9);
    assert.ok(all.body.data.avgResolutionHours > 0);

    const mine = await api('GET', '/reports/stats', { token: tokens.tech });
    assert.ok(mine.body.data.totalIssues < all.body.data.totalIssues);
    assert.equal(mine.body.data.unassignedIssues, null);
});

test('reporter can cancel only pending reports', async () => {
    const resolved = await api('DELETE', `/reports/${reportId}`, { token: tokens.student });
    assert.equal(resolved.status, 403);

    const lab = (await api('GET', '/admin/labs')).body.data[0];
    const created = await api('POST', '/reports', {
        token: tokens.student,
        body: { lab: lab._id, computerNumber: 'DEL-1', category: 'Other', description: 'to cancel' }
    });
    const del = await api('DELETE', `/reports/${created.body.data._id}`, { token: tokens.student });
    assert.equal(del.status, 200);
});

test('role-based access to admin endpoints', async () => {
    assert.equal((await api('GET', '/admin/users', { token: tokens.admin })).status, 403);
    assert.equal((await api('GET', '/admin/users', { token: tokens.student })).status, 403);
    assert.equal((await api('GET', '/admin/assignees', { token: tokens.tech })).status, 403);
    assert.equal((await api('GET', '/admin/users', { token: tokens.super })).status, 200);
});

test('super admin user management guards', async () => {
    const selfDemote = await api('PUT', `/admin/users/${tokens.superId}`, { token: tokens.super, body: { role: 'user' } });
    assert.equal(selfDemote.status, 400);
    const selfDeactivate = await api('PUT', `/admin/users/${tokens.superId}`, { token: tokens.super, body: { isActive: false } });
    assert.equal(selfDeactivate.status, 400);

    const created = await api('POST', '/admin/users', {
        token: tokens.super,
        body: { name: 'Temp Tech', email: 'temp@hu.edu.so', password: 'temp1234', role: 'technician' }
    });
    assert.equal(created.status, 201);
    const id = created.body.data._id;

    const edit = await api('PUT', `/admin/users/${id}`, { token: tokens.super, body: { name: 'Temp Tech 2' } });
    assert.equal(edit.status, 200);
    assert.equal((await api('POST', '/auth/login', { body: { email: 'temp@hu.edu.so', password: 'temp1234' } })).status, 200,
        'admin edit must not corrupt the password');

    const reset = await api('PATCH', `/admin/users/${id}/reset-password`, { token: tokens.super, body: { password: 'reset999' } });
    assert.equal(reset.status, 200);
    assert.equal((await api('POST', '/auth/login', { body: { email: 'temp@hu.edu.so', password: 'reset999' } })).status, 200);

    const tempLogin = await api('POST', '/auth/login', { body: { email: 'temp@hu.edu.so', password: 'reset999' } });
    await api('PUT', `/admin/users/${id}`, { token: tokens.super, body: { isActive: false } });
    assert.equal((await api('POST', '/auth/login', { body: { email: 'temp@hu.edu.so', password: 'reset999' } })).status, 403);
    assert.equal((await api('GET', '/auth/me', { token: tempLogin.body.token })).status, 403, 'existing token of deactivated user is rejected');

    const linked = await api('DELETE', `/admin/users/${tokens.techId}`, { token: tokens.super });
    assert.equal(linked.status, 400, 'users with reports cannot be deleted');
    const del = await api('DELETE', `/admin/users/${id}`, { token: tokens.super });
    assert.equal(del.status, 200);
    assert.equal((await api('GET', '/auth/me', { token: tempLogin.body.token })).status, 401);
});

test('faculty / department / lab CRUD with integrity checks', async () => {
    const fac = await api('POST', '/admin/faculties', { token: tokens.super, body: { name: 'Faculty of Law' } });
    assert.equal(fac.status, 201);
    const dupFac = await api('POST', '/admin/faculties', { token: tokens.super, body: { name: 'Faculty of Law' } });
    assert.equal(dupFac.status, 400);

    const dept = await api('POST', '/admin/departments', { token: tokens.super, body: { name: 'Sharia Law', faculty: fac.body.data._id } });
    assert.equal(dept.status, 201);

    const otherFaculty = (await api('GET', '/admin/faculties')).body.data.find(f => f.name.includes('Engineering'));
    const badLab = await api('POST', '/admin/labs', {
        token: tokens.super,
        body: { name: 'Bad Lab', faculty: otherFaculty._id, department: dept.body.data._id }
    });
    assert.equal(badLab.status, 400);

    const lab = await api('POST', '/admin/labs', {
        token: tokens.super,
        body: { name: 'Law Lab', faculty: fac.body.data._id, department: dept.body.data._id, capacity: 20 }
    });
    assert.equal(lab.status, 201);

    const upd = await api('PUT', `/admin/labs/${lab.body.data._id}`, { token: tokens.super, body: { name: 'Law Computer Lab', location: 'Block D' } });
    assert.equal(upd.body.data.name, 'Law Computer Lab');

    assert.equal((await api('DELETE', `/admin/faculties/${fac.body.data._id}`, { token: tokens.super })).status, 400);
    assert.equal((await api('DELETE', `/admin/departments/${dept.body.data._id}`, { token: tokens.super })).status, 400);
    assert.equal((await api('DELETE', `/admin/labs/${lab.body.data._id}`, { token: tokens.super })).status, 200);
    assert.equal((await api('DELETE', `/admin/departments/${dept.body.data._id}`, { token: tokens.super })).status, 200);
    assert.equal((await api('DELETE', `/admin/faculties/${fac.body.data._id}`, { token: tokens.super })).status, 200);

    const usedLab = (await api('GET', '/admin/labs')).body.data.find(l => l.name === 'CS Lab A');
    assert.equal((await api('DELETE', `/admin/labs/${usedLab._id}`, { token: tokens.super })).status, 400);
});

test('activity log records logins and report changes', async () => {
    const { status, body } = await api('GET', '/admin/logs', { token: tokens.super });
    assert.equal(status, 200);
    for (const action of ['LOGIN', 'REGISTER', 'CREATED_REPORT', 'UPDATED_REPORT', 'DELETED_USER']) {
        assert.ok(body.actions.includes(action), `missing ${action}`);
    }
});

test('unknown API routes return 404 JSON and bad ids return 404', async () => {
    assert.equal((await api('GET', '/nope')).status, 404);
    assert.equal((await api('GET', '/reports/not-an-id', { token: tokens.super })).status, 404);
});

test('logout clears the session cookie', async () => {
    const { status } = await api('POST', '/auth/logout', { token: tokens.student });
    assert.equal(status, 200);
});
