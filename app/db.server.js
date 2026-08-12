import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

let prismaInstance;
const getPrisma = () => {
  if (!prismaInstance) {
    if (globalThis.DB) {
      const adapter = new PrismaD1(globalThis.DB);
      prismaInstance = new PrismaClient({ adapter });
    } else {
      prismaInstance = new PrismaClient();
    }
  }
  return prismaInstance;
};

const prisma = new Proxy({}, {
  get: (target, prop) => {
    const client = getPrisma();
    const val = client[prop];
    return typeof val === 'function' ? val.bind(client) : val;
  }
});

export default prisma;
