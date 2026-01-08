// --- DATA ENGINEERING LAYER ---

export const STATUS_TIERS = {
  BLUE: { label: 'Blue Member', bonusMultiplier: 0.75, color: 'text-bilt-blue', bg: 'bg-bilt-blue/20', border: 'border-bilt-blue' },
  SILVER: { label: 'Silver Member', bonusMultiplier: 1.00, color: 'text-gray-300', bg: 'bg-gray-300/20', border: 'border-gray-300' },
  GOLD: { label: 'Gold Member', bonusMultiplier: 1.25, color: 'text-bilt-gold', bg: 'bg-bilt-gold/20', border: 'border-bilt-gold' },
  PLATINUM: { label: 'Platinum Member', bonusMultiplier: 1.50, color: 'text-bilt-platinum', bg: 'bg-bilt-platinum/20', border: 'border-bilt-platinum' },
};

export const PARTNERS = [
  { id: 'hyatt', name: 'World of Hyatt', type: 'HOTEL', ratio: 1.0, isBestValue: true },
  { id: 'marriott', name: 'Marriott Bonvoy', type: 'HOTEL', ratio: 1.0, isMarriott: true },
  { id: 'accor', name: 'Accor Live Limitless', type: 'HOTEL', ratio: 0.666, isAccor: true },
  { id: 'united', name: 'United MileagePlus', type: 'AIRLINE', ratio: 1.0 },
  { id: 'virgin', name: 'Virgin Atlantic', type: 'AIRLINE', ratio: 1.0 },
  { id: 'flyingblue', name: 'Air France/KLM', type: 'AIRLINE', ratio: 1.0 },
];

export const PERSONAS = {
  NEW: { label: 'New User', status: 'BLUE', points: '5000' },
  PRO: { label: 'Pro Traveler', status: 'GOLD', points: '20000' },
  GOD: { label: 'Bilt Exec', status: 'PLATINUM', points: '50000' },
};

// THE CALCULATION ENGINE
export const calculateTransfer = (pointsInput, partner, statusKey, isRentDay) => {
  // Ensure we handle strings or numbers safely
  const safeInput = pointsInput ? String(pointsInput) : '0';
  const points = parseInt(safeInput.replace(/[^0-9]/g, '')) || 0;
  
  if (points === 0) return 0;

  // 1. Base Ratio Logic
  let result = points * partner.ratio;

  // 2. Marriott Bulk Bonus Logic (Every 20k points = 5k bonus)
  if (partner.isMarriott) {
    const bonuses = Math.floor(points / 20000);
    result += (bonuses * 5000);
  }

  // 3. Rent Day Logic (Tiered Multipliers)
  if (isRentDay) {
    const tierData = STATUS_TIERS[statusKey];
    // Formula: Base Result + (Base Result * Multiplier)
    const bonusPoints = result * tierData.bonusMultiplier;
    result += bonusPoints;
  }

  return Math.floor(result);
};