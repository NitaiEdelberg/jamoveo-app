// Central config. JWT_SECRET signs *and* verifies tokens, so both the auth route
// and the socket layer must import it from here to stay in sync.
// Set JWT_SECRET in the environment for production; the fallback is dev-only.
module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'jamoveo-secret',
};
