import type { UserRole } from "@ride/contracts";
import type { FastifyReply, FastifyRequest } from "fastify";

export function requireRole(...roles: UserRole[]) {
  return async function requireRoleHandler(request: FastifyRequest, reply: FastifyReply) {
    const user = request.user;
    if (!user) {
      reply.code(401).send({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
          details: {},
          requestId: request.id,
        },
      });
      return;
    }

    if (!roles.includes(user.role)) {
      reply.code(403).send({
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to this resource",
          details: {},
          requestId: request.id,
        },
      });
    }
  };
}
