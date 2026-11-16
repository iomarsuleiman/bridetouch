export default {
  providers: [
    {
      // Your Clerk instance's issuer domain.
      domain:
        process.env.CLERK_ISSUER_DOMAIN ??
        "https://humane-satyr-4557.clerk.accounts.dev",
      // Must match the audience in your Clerk "convex" JWT template.
      applicationID: "convex",
    },
  ],
};
