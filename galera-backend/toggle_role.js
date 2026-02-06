// galera-backend/toggle_role.js
const db = require('./database');

const myEmail = "prajwal5.intern@phonepe.com";; // <--- YOUR EMAIL
const newRole = process.argv[2]; // 'admin' or 'developer'

if (!newRole) {
    console.log("Please specify a role: node toggle_role.js [admin|developer]");
    process.exit(1);
}

db.run("UPDATE users SET role = ? WHERE email = ?", [newRole, myEmail], (err) => {
    if (err) console.error(err);
    else console.log(`✅ Success! Updated ${myEmail} to role: ${newRole}`);
});