export function checkAuth(req: Request): boolean {
  const auth = req.headers.get("authorization")
  return auth === `Bearer ${process.env.ADMIN_SECRET}`
}
