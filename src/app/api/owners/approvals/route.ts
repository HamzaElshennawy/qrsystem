// Removed self-registration approvals
export async function GET() { return new Response(null, { status: 410, statusText: "Gone" }); }
export async function POST() { return new Response(null, { status: 410, statusText: "Gone" }); }


