import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to clean up duplicate reactions in the database.
 * Ensures each user has only ONE reaction per message (keeps the most recent one).
 */
async function cleanupDuplicateReactions() {
  try {
    // Get all reactions
    const allReactions = await prisma.message_reactions.findMany({
      orderBy: {
        created_at: 'desc', // Most recent first
      },
    });

    // Group by message_id + user_id
    const groupedReactions = new Map<string, typeof allReactions>();

    allReactions.forEach((reaction) => {
      const key = `${reaction.message_id}_${reaction.user_id}`;
      
      if (!groupedReactions.has(key)) {
        groupedReactions.set(key, []);
      }
      
      groupedReactions.get(key)!.push(reaction);
    });

    // Find duplicates and delete old ones
    let totalDeleted = 0;
    let messagesWithDuplicates = 0;

    for (const [key, reactions] of groupedReactions.entries()) {
      if (reactions.length > 1) {
        messagesWithDuplicates++;
        const [messageId, userId] = key.split('_').map(Number);

        // Keep the first one (most recent), delete the rest
        const toDelete = reactions.slice(1);
        
        for (const reaction of toDelete) {
          await prisma.message_reactions.delete({
            where: { id: reaction.id },
          });
          totalDeleted++;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Cleanup completed!`);
    console.log(`📝 Messages with duplicates: ${messagesWithDuplicates}`);
    console.log(`🗑️  Total reactions deleted: ${totalDeleted}`);
    console.log(`✨ Database is now clean!`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupDuplicateReactions()
  .then(() => {
    console.log('\n✅ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
