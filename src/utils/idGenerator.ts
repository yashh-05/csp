import { query } from '../config/db';

/**
 * Generates a unique, standardized complaint ID.
 * Format: MAC-{Block}{HouseNumber}-{YYYYMMDD}-{DailyRunningNumber}
 * Example: MAC-B204-20260804-001
 * 
 * @param block Gated community block (e.g., 'B', 'Block-A')
 * @param houseNumber Apartment or villa number (e.g., '204', 'Villa-12')
 * @returns A unique string complaint ID
 */
export const generateComplaintId = async (
  block: string,
  houseNumber: string
): Promise<string> => {
  // 1. Sanitize block and house number (alphanumeric, uppercase, no spaces)
  const cleanBlock = block.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const cleanHouse = houseNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const houseIdentifier = `${cleanBlock}${cleanHouse}`;

  // 2. Format current date as YYYYMMDD
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // 3. Query DB to determine the daily running number count
  // We count complaints created between 00:00:00 and 23:59:59 server time today
  const countQuery = `
    SELECT COUNT(*) as count 
    FROM complaints 
    WHERE created_at >= DATE_TRUNC('day', CURRENT_TIMESTAMP)
      AND created_at < DATE_TRUNC('day', CURRENT_TIMESTAMP) + INTERVAL '1 day'
  `;
  
  const result = await query(countQuery);
  const todaysCount = parseInt(result.rows[0].count, 10);
  
  // Daily running number starts at 1, padded to 3 digits (e.g., 001, 002)
  const runningNumber = String(todaysCount + 1).padStart(3, '0');

  // 4. Construct complete complaint ID
  return `MAC-${houseIdentifier}-${dateStr}-${runningNumber}`;
};
