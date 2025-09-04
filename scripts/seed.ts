import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";
import { eq } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool, schema });

const SAMPLE_CONTRACT_NAME = "Sample ICU Travel Contract";

async function seedDatabase() {
  console.log("🌱 Seeding database with sample contract data...");

  try {
    // Clean up any existing sample data first
    await cleanupSampleData();

    // Insert sample contract
    const [contract] = await db.insert(schema.contracts).values({
      name: SAMPLE_CONTRACT_NAME,
      facility: "Memorial Regional Medical Center",
      role: "ICU Nurse",
      startDate: "2025-09-15",
      endDate: "2025-12-15",
      baseRate: "45.00",
      otRate: "67.50",
      hoursPerWeek: "36.00",
      status: "active",
      timezone: "America/Chicago",
    }).returning();

    console.log(`✅ Created contract: ${contract.name} (ID: ${contract.id})`);

    // Insert contract schedule days (Monday, Tuesday, Wednesday = 3x12 hour shifts)
    const scheduleDays = [
      { weekday: 1, enabled: true, startLocal: "07:00", endLocal: "19:00" }, // Monday
      { weekday: 2, enabled: true, startLocal: "07:00", endLocal: "19:00" }, // Tuesday  
      { weekday: 3, enabled: true, startLocal: "07:00", endLocal: "19:00" }, // Wednesday
      { weekday: 0, enabled: false, startLocal: "07:00", endLocal: "19:00" }, // Sunday
      { weekday: 4, enabled: false, startLocal: "07:00", endLocal: "19:00" }, // Thursday
      { weekday: 5, enabled: false, startLocal: "07:00", endLocal: "19:00" }, // Friday
      { weekday: 6, enabled: false, startLocal: "07:00", endLocal: "19:00" }, // Saturday
    ];

    await db.insert(schema.contractScheduleDay).values(
      scheduleDays.map(day => ({
        contractId: contract.id,
        ...day
      }))
    );

    console.log(`✅ Created ${scheduleDays.length} schedule day entries`);

    // Insert sample shifts for this week and next week
    const today = new Date();
    const shifts: Array<{
      contractId: number;
      startUtc: Date;
      endUtc: Date;
      localDate: string;
      source: string;
      status: string;
    }> = [];

    // Generate shifts for the next 2 weeks based on the schedule
    for (let i = 0; i < 14; i++) {
      const shiftDate = new Date(today);
      shiftDate.setDate(today.getDate() + i);
      
      const weekday = shiftDate.getDay();
      const enabledDay = scheduleDays.find(d => d.weekday === weekday && d.enabled);
      
      if (enabledDay) {
        // Convert local time to UTC for database storage
        const startUtc = new Date(shiftDate);
        startUtc.setHours(parseInt(enabledDay.startLocal.split(':')[0]) + 5, 0, 0, 0); // +5 for CST to UTC
        
        const endUtc = new Date(shiftDate);
        endUtc.setHours(parseInt(enabledDay.endLocal.split(':')[0]) + 5, 0, 0, 0); // +5 for CST to UTC
        
        const localDateStr = shiftDate.toISOString().split('T')[0];
        
        shifts.push({
          contractId: contract.id,
          startUtc: startUtc,
          endUtc: endUtc,
          localDate: localDateStr,
          source: "contract_seed",
          status: i < 3 ? "Finalized" : "In Process", // Mark first 3 as completed
        });
      }
    }

    if (shifts.length > 0) {
      await db.insert(schema.shifts).values(shifts);
      console.log(`✅ Created ${shifts.length} sample shifts`);
    }

    console.log("🎉 Database seeding completed successfully!");
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

async function cleanupSampleData() {
  console.log("🧹 Cleaning up existing sample data...");
  
  try {
    // Find sample contract
    const contracts = await db.select().from(schema.contracts)
      .where(eq(schema.contracts.name, SAMPLE_CONTRACT_NAME));
    
    if (contracts.length > 0) {
      const contractId = contracts[0].id;
      
      // Delete shifts (cascade should handle this, but being explicit)
      await db.delete(schema.shifts)
        .where(eq(schema.shifts.contractId, contractId));
      
      // Delete schedule days (cascade should handle this, but being explicit)
      await db.delete(schema.contractScheduleDay)
        .where(eq(schema.contractScheduleDay.contractId, contractId));
      
      // Delete contract
      await db.delete(schema.contracts)
        .where(eq(schema.contracts.id, contractId));
      
      console.log("✅ Cleaned up existing sample data");
    }
  } catch (error) {
    console.log("ℹ️  No existing sample data to clean up");
  }
}

// Handle command line arguments
const command = process.argv[2];

if (command === 'cleanup') {
  cleanupSampleData()
    .then(() => {
      console.log("🎉 Cleanup completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Cleanup failed:", error);
      process.exit(1);
    });
} else {
  seedDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}