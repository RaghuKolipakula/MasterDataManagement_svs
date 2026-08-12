import { createPagesFunctionHandler } from "@remix-run/cloudflare-pages";

// eslint-disable-next-line import/no-unresolved
import * as build from "../build/server";

export const onRequest = createPagesFunctionHandler({ 
  build,
  getLoadContext: (context) => {
    globalThis.DB = context.env.DB;
    return context.env;
  }
});
