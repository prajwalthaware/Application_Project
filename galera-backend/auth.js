const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./database');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    const email = profile.emails[0].value;
    const name = profile.displayName;

    // 1. Check if user exists in our DB
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) return done(err);

        if (!row) {
            // Auto-register new users as 'user' (peer role)
            db.run("INSERT INTO users (email, name, role) VALUES (?, ?, 'user')", [email, name], (err) => {
                const newUser = { email, name, role: 'user' };
                return done(null, newUser);
            });
        } else {
            // User exists, return their profile
            return done(null, row);
        }
    });
  }
));

// Serialize: Save user.email to the session cookie
passport.serializeUser((user, done) => {
    done(null, user.email);
});

// Deserialize: Read cookie, find user in DB
passport.deserializeUser((email, done) => {
    db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        done(null, row);
    });
});

module.exports = passport;