# Coast FIRE Calculator

A comprehensive web application for calculating Coast FIRE (Financial Independence, Retire Early) milestones. This calculator helps users determine when they can stop contributing to retirement savings and let compound growth handle the rest.

## Features

### Core Functionality
- **Coast FIRE Calculation**: Determines the amount needed today to reach retirement goals through compound growth alone
- **Interactive Inputs**: Real-time calculation updates as you adjust values
- **Visual Projections**: Interactive chart showing net worth growth over time
- **Comprehensive Metrics**: Displays progress, timelines, and savings requirements

### Input Fields
- Current Age (18-80 years)
- Planned Retirement Age (50-80 years)
- Annual Retirement Spending (in today's dollars)
- Current Invested Assets
- Monthly Contributions (optional)

### Adjustable Parameters
- Investment Rate of Return (1% - 15%)
- Inflation Rate (0% - 10%)
- Safe Withdrawal Rate (2% - 8%)

### Results Displayed
- Coast FIRE number (target amount needed today)
- Regular FIRE number (total amount needed at retirement)
- Progress percentage toward Coast FIRE
- Years until Coast FIRE is reached
- Monthly savings needed to reach Coast FIRE
- Years of compound growth remaining

## Technical Features

### Accessibility
- Full keyboard navigation support
- Screen reader compatibility with ARIA labels
- High contrast mode support
- Focus management and visual indicators
- Error messages with role="alert"

### Responsive Design
- Mobile-first approach
- Works on all modern browsers
- Optimized for tablets and desktop

### Data Persistence
- Saves inputs to local storage
- Restores previous session data
- Privacy-focused (no server storage)

### Real-time Updates
- Calculations update instantly as you adjust sliders
- Smooth chart animations
- Form validation with immediate feedback

## Usage

1. Open `index.html` in your web browser
2. Enter your current age and planned retirement age
3. Input your annual retirement spending goal
4. Add your current invested assets
5. Optionally add monthly contributions
6. Adjust the sliders for investment returns, inflation, and withdrawal rates
7. View your Coast FIRE results and projections

## Calculation Logic

### Coast FIRE Formula
```
Coast FIRE Number = Annual Retirement Spending / (SWR × (1 + real return rate)^years to retirement)
```

### Real Return Rate
```
Real Return Rate = Investment Rate of Return - Inflation Rate
```

### Regular FIRE Formula
```
FIRE Number = Annual Retirement Spending / Safe Withdrawal Rate
```

## Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Files Structure
```
calculator-pro/
├── index.html          # Main HTML structure
├── styles.css          # Styling and responsive design
├── script.js           # Calculator logic and interactivity
└── README.md          # This documentation
```

## Key Concepts

**Coast FIRE**: The point where your investments will grow to support traditional retirement without additional contributions.

**FIRE Number**: The total amount needed to retire, calculated using the safe withdrawal rate.

**Safe Withdrawal Rate**: The percentage of your portfolio you can withdraw annually in retirement (typically 4%).

**Real Return Rate**: Investment returns adjusted for inflation.

## Future Enhancements
- PDF export functionality
- Multiple scenario comparisons
- Historical data integration
- Additional calculator types
- Email results feature

## Contributing

This is a client-side application built with vanilla JavaScript, HTML, and CSS. The Chart.js library is used for data visualization.

## License

This project is open source and available under the MIT License.