const RIDE_TYPES = [
  { type: 'STANDARD', baseFare: 5.0, description: 'Affordable rides for everyday travel.' },
  { type: 'PREMIUM', baseFare: 10.0, description: 'Luxury rides with top-rated drivers.' },
  { type: 'XL', baseFare: 8.0, description: 'Larger vehicles for bigger groups.' },
  { type: 'ECO', baseFare: 4.0, description: 'Eco-friendly rides at a lower cost.' },
  { type: 'MOTORBIKE', baseFare: 3.0, description: 'Quick and affordable two-wheeler rides.' },
  { type: 'SCHEDULED', baseFare: 6.0, description: 'Pre-booked rides at your convenience.' },
  { type: 'FREE', baseFare: 0.0, description: 'Free rides for testing purposes.' }, // Added
];

module.exports = { RIDE_TYPES };