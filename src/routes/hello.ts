import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";

const HelloResponseSchema = z
  .object({
    message: z.string().openapi({ example: "Hello, world!" }),
    method: z.string().optional().openapi({ example: "GET" }),
  })
  .openapi("HelloResponse");

const HelloNameParamsSchema = z.object({
  name: z
    .string()
    .min(1)
    .openapi({
      param: { name: "name", in: "path" },
      example: "world",
    }),
});

const helloGetRoute = createRoute({
  method: "get",
  path: "/api/hello",
  tags: ["Examples"],
  summary: "Hello GET",
  description: "Returns a greeting",
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: HelloResponseSchema,
        },
      },
    },
  },
});

const helloPutRoute = createRoute({
  method: "put",
  path: "/api/hello",
  tags: ["Examples"],
  summary: "Hello PUT",
  description: "Returns a greeting via PUT",
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: HelloResponseSchema,
        },
      },
    },
  },
});

const helloByNameRoute = createRoute({
  method: "get",
  path: "/api/hello/{name}",
  tags: ["Examples"],
  summary: "Hello by name",
  request: {
    params: HelloNameParamsSchema,
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: HelloResponseSchema,
        },
      },
    },
    400: {
      description: "Invalid parameter",
    },
  },
});

export function registerHelloRoutes(app: OpenAPIHono) {
  app.openapi(helloGetRoute, (c) =>
    c.json({
      message: "Hello, world!",
      method: "GET",
    }),
  );

  app.openapi(helloPutRoute, (c) =>
    c.json({
      message: "Hello, world!",
      method: "PUT",
    }),
  );

  app.openapi(helloByNameRoute, (c) => {
    const { name } = c.req.valid("param");
    return c.json({
      message: `Hello, ${name}!`,
    });
  });
}
