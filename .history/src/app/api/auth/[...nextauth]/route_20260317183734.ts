import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Contraseña", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email }
                })

                if (!user) return null

                const passwordMatch = await bcrypt.compare(credentials.password, user.password)

                if (!passwordMatch) return null

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name
                }
            }
        })
    ],
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
            }
            return token
        },
        async session({ session, token }) {
            // FORZAR la inclusión del ID
            if (session.user) {
                session.user.id = token.id as string
                // También incluir explícitamente otros campos
                session.user.email = token.email as string
                session.user.name = token.name as string
            }
            return session
        }
    },
    pages: {
        signIn: "/login",
    },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }