export function GET() {
  return Response.json({ service: "maths", protocol: 7, version: process.env.NEXT_PUBLIC_APP_VERSION, release: process.env.NEXT_PUBLIC_RELEASE }, {
    headers: { "Cache-Control": "no-store" },
  });
}
