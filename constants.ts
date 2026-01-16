
import { FastingPlan } from './types';

export const FASTING_PLANS: FastingPlan[] = [
  { id: '12-12', name: '12:12', fastHours: 12, eatHours: 12, description: 'Gentle start' },
  { id: '16-8', name: '16:8', fastHours: 16, eatHours: 8, description: 'LeanGains - The standard' },
  { id: '18-6', name: '18:6', fastHours: 18, eatHours: 6, description: 'Advanced metabolic health' },
  { id: '20-4', name: '20:4', fastHours: 20, eatHours: 4, description: 'The Warrior Diet' },
  { id: '23-1', name: '23:1', fastHours: 23, eatHours: 1, description: 'OMAD (One Meal A Day)' },
  { id: '24-0', name: '24:0', fastHours: 24, eatHours: 0, description: 'Full day metabolic reset' }
];

export const COLORS = {
  primary: '#2DD4BF', // Teal 400
  accent: '#F43F5E',  // Rose 500
  bgCard: '#18181B', // Zinc 900
  bgApp: '#000000'
};
