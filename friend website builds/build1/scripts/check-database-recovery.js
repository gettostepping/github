const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkRecoveryOptions() {
  try {
    console.log('🔍 Checking database recovery options...\n')
    
    // Connect to database
    await prisma.$connect()
    console.log('✅ Connected to database\n')
    
    // Get database connection info (won't show password for security)
    const dbUrl = process.env.DATABASE_URL || ''
    
    // Determine provider
    let provider = 'Unknown'
    if (dbUrl.includes('supabase')) {
      provider = 'Supabase'
      console.log('📦 Database Provider: Supabase')
      console.log('   → Check Supabase Dashboard → Database → Backups')
      console.log('   → Point-in-time recovery available in Supabase Pro/Enterprise')
    } else if (dbUrl.includes('neon.tech') || dbUrl.includes('neon')) {
      provider = 'Neon'
      console.log('📦 Database Provider: Neon')
      console.log('   → Check Neon Dashboard → Branches → Point-in-time recovery')
      console.log('   → Automatic backups available')
    } else if (dbUrl.includes('railway')) {
      provider = 'Railway'
      console.log('📦 Database Provider: Railway')
      console.log('   → Check Railway Dashboard → Database → Backups')
    } else if (dbUrl.includes('render.com')) {
      provider = 'Render'
      console.log('📦 Database Provider: Render')
      console.log('   → Check Render Dashboard → Database → Backups')
    } else if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
      provider = 'Local PostgreSQL'
      console.log('📦 Database Provider: Local PostgreSQL')
      console.log('   → Check for .sql dump files')
      console.log('   → Check PostgreSQL data directory for backups')
    } else if (dbUrl.includes('amazonaws.com') || dbUrl.includes('rds')) {
      provider = 'AWS RDS'
      console.log('📦 Database Provider: AWS RDS')
      console.log('   → Check AWS Console → RDS → Snapshots')
      console.log('   → Automated backups enabled by default')
    } else if (dbUrl.includes('azure')) {
      provider = 'Azure'
      console.log('📦 Database Provider: Azure')
      console.log('   → Check Azure Portal → Backup/Restore')
    } else {
      console.log('📦 Database Provider: Custom PostgreSQL')
      console.log('   → Check your hosting provider dashboard for backups')
    }
    
    console.log('\n📊 Current Database State:')
    
    // Check current state
    const userCount = await prisma.user.count()
    const profileCount = await prisma.profile.count()
    const watchlistCount = await prisma.watchlist.count()
    const roleCount = await prisma.role.count()
    const commentCount = await prisma.profileComment.count()
    const ratingCount = await prisma.rating.count()
    
    console.log(`   Users: ${userCount}`)
    console.log(`   Profiles: ${profileCount}`)
    console.log(`   Watchlists: ${watchlistCount}`)
    console.log(`   Roles: ${roleCount}`)
    console.log(`   Comments: ${commentCount}`)
    console.log(`   Ratings: ${ratingCount}`)
    
    if (userCount === 0) {
      console.log('\n⚠️  Database appears to be empty (was reset)')
      console.log('\n💡 Recovery Steps:')
      console.log('   1. Check your database provider dashboard for backups')
      console.log('   2. Look for automatic backups or snapshots')
      console.log('   3. Check for point-in-time recovery options')
      console.log('   4. If you have a .sql dump file, restore it with:')
      console.log('      psql <your-connection-string> < backup.sql')
      console.log('\n   5. If using managed service:')
      if (provider === 'Supabase') {
        console.log('      → Go to Supabase Dashboard')
        console.log('      → Database → Backups')
        console.log('      → Restore from backup')
      } else if (provider === 'Neon') {
        console.log('      → Go to Neon Dashboard')
        console.log('      → Create a new branch from before the migration')
        console.log('      → Or use point-in-time recovery')
      }
    } else {
      console.log('\n✅ Database has data! Migration may not have reset everything.')
      console.log('   Check if your data is still intact.')
    }
    
    // Check if we can query PostgreSQL directly for backup info
    try {
      const result = await prisma.$queryRaw`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as db_size,
          current_database() as db_name,
          version() as pg_version
      `
      console.log('\n📈 Database Info:')
      console.log(result)
    } catch (e) {
      // Ignore if query fails
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n💡 Make sure DATABASE_URL is set in your .env.local file')
  } finally {
    await prisma.$disconnect()
  }
}

checkRecoveryOptions()

