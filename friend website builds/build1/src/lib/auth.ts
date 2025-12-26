import type { NextAuthOptions, DefaultSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import DiscordProvider from "next-auth/providers/discord"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// Extend the default Session and JWT types
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      image: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    name: string
    email: string
    image: string
  }

  interface JWT {
    user?: User
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null
      
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
      
        if (!user || !user.password) return null
      
        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null
      
        return {
          id: user.id,
          email: user.email ?? "",   // ensure string
          name: user.name ?? "",     // ensure string
          image: user.image ?? "/placeholder.png",
        }
      },
    }),

    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async signIn({ user, account, profile, credentials, email, }) {
      // Check for pending registrations and tracked identities (only for Discord OAuth)
      if (account?.provider === "discord" && profile) {
        const discordProfile = profile as any
        
        // First check if there's already a pending registration
        let pending = await prisma.pendingRegistration.findFirst({
          where: {
            discordId: discordProfile.id,
            status: 'pending'
          }
        })
        
        if (pending) {
          console.log(`⚠️  Pending registration detected for ${discordProfile.email}, blocking sign-in`)
          return `/auth/pending-approval?discordId=${encodeURIComponent(discordProfile.id)}&email=${encodeURIComponent(discordProfile.email)}`
        }
        
        // Check if this is a new user (no existing account)
        const existingUser = await prisma.user.findUnique({
          where: { email: discordProfile.email }
        })
        
        if (!existingUser) {
          // New user - redirect to completion page to set password
          // Tracking check will happen when they submit the form
          console.log(`🔍 New user detected, redirecting to Discord completion page...`)
          
          // Encode Discord profile data in URL params for the completion page
          const params = new URLSearchParams({
            discordId: discordProfile.id,
            email: discordProfile.email,
            name: discordProfile.username || discordProfile.global_name || 'User',
            avatar: discordProfile.avatar || '',
            banner: discordProfile.banner || ''
          })
          
          return `/auth/register/discord-complete?${params.toString()}`
        }
      }
      
      // Existing users can sign in normally
      return true
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.user = user
      } else if (token.user && typeof token.user === 'object' && 'email' in token.user && token.user.email) {
        // Check if the user still exists in the database (account deletion detection)
        // Only check on subsequent requests, not during initial sign-in
        const existingUser = await prisma.user.findUnique({
          where: { email: token.user.email as string }
        })
        
        // If user was deleted, invalidate the token
        if (!existingUser) {
          console.log(`⚠️ User ${token.user.email} was deleted, invalidating token`)
          return {} // Return empty token to trigger sign out
        }
      }
      
      // Handle Discord registration
      if (account?.provider === "discord" && profile) {
        const discordProfile = profile as any
        const email = discordProfile.email
        
        if (email) {
          // Build avatar and banner URLs
          const avatarUrl = discordProfile.avatar
            ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png`
            : '/noprofilepicture.jpg'
          
          const bannerUrl = discordProfile.banner
            ? `https://cdn.discordapp.com/banners/${discordProfile.id}/${discordProfile.banner}.${discordProfile.banner.startsWith('a_') ? 'gif' : 'png'}`
            : null
          
          // Check if user exists (new users are redirected to completion page by signIn callback)
          let dbUser = await prisma.user.findUnique({
            where: { email }
          })
          
          if (dbUser) {
            // User exists - update their Discord avatar and banner in case they changed
            dbUser = await prisma.user.update({
              where: { id: dbUser.id },
              data: {
                image: avatarUrl,
                banner: bannerUrl,
                discordId: discordProfile.id,
                name: discordProfile.username || discordProfile.global_name,
              }
            })
            console.log(`✅ Updated Discord data for user: ${email}`)
            
            // Update token with database user info including the latest image
            token.user = {
              ...(token.user || {}),
              id: dbUser.id,
              image: dbUser.image || '',
              name: dbUser.name || ''
            }
          } else {
            // New user - they should have been redirected to completion page by signIn callback
            console.log(`⚠️ New Discord user in JWT callback - should not reach here`)
          }
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token.user) {
        session.user = {
          ...session.user,
          ...token.user, // now includes image
        }
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
