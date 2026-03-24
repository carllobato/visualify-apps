This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Requires **Node.js 20.9+** (Next.js 16). From this directory:

```bash
npm ci
npm run dev
```

Keep that terminal open. When you see **“Ready”**, open [http://localhost:3000](http://localhost:3000) (or [http://127.0.0.1:3000](http://127.0.0.1:3000)).

### `ERR_CONNECTION_REFUSED`

The browser can only connect while the dev server is running.

1. Run `npm run dev` from **this** folder (where `package.json` lives) and wait for **Ready**.
2. If the command exits with an error, fix that first—nothing will listen on port 3000 until it stays running.
3. If port 3000 is taken, Next will suggest another port in the terminal—use **that** URL, not 3000.
4. If dev crashes on startup, try Turbopack off: `npm run dev:webpack`.

Do **not** use `npm start` for local development unless you have already run `npm run build`; `npm start` is for production mode.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
