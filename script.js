class CoastFireCalculator {
    constructor() {
        this.chart = null;
        this.initializeEventListeners();
        this.loadFromStorage();
        this.calculate();
    }

    initializeEventListeners() {
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateSliderValues();
                this.calculate();
                this.saveToStorage();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.calculate();
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearErrors();
            }
        });

        this.updateSliderValues();
    }

    updateSliderValues() {
        const investmentRate = document.getElementById('investment-rate');
        const inflationRate = document.getElementById('inflation-rate');
        const withdrawalRate = document.getElementById('withdrawal-rate');

        document.getElementById('investment-rate-value').textContent = parseFloat(investmentRate.value).toFixed(1) + '%';
        document.getElementById('inflation-rate-value').textContent = parseFloat(inflationRate.value).toFixed(1) + '%';
        document.getElementById('withdrawal-rate-value').textContent = parseFloat(withdrawalRate.value).toFixed(1) + '%';
    }

    getInputValues() {
        return {
            currentAge: parseInt(document.getElementById('current-age').value),
            retirementAge: parseInt(document.getElementById('retirement-age').value),
            annualSpending: parseFloat(document.getElementById('annual-spending').value),
            currentAssets: parseFloat(document.getElementById('current-assets').value),
            monthlyContributions: parseFloat(document.getElementById('monthly-contributions').value) || 0,
            investmentRate: parseFloat(document.getElementById('investment-rate').value) / 100,
            inflationRate: parseFloat(document.getElementById('inflation-rate').value) / 100,
            withdrawalRate: parseFloat(document.getElementById('withdrawal-rate').value) / 100
        };
    }

    calculate() {
        const inputs = this.getInputValues();
        
        if (!this.validateInputs(inputs)) {
            return;
        }

        const results = this.performCalculations(inputs);
        this.updateResults(results);
        this.updateChart(inputs, results);
    }

    validateInputs(inputs) {
        this.clearErrors();
        let isValid = true;

        if (inputs.currentAge < 18 || inputs.currentAge > 80) {
            this.showError('current-age', 'Age must be between 18 and 80');
            isValid = false;
        }


        if (inputs.retirementAge <= inputs.currentAge) {
            this.showError('retirement-age', 'Retirement age must be greater than current age');
            isValid = false;
        }

        if (inputs.annualSpending <= 0) {
            this.showError('annual-spending', 'Annual spending must be greater than 0');
            isValid = false;
        }

        if (inputs.currentAssets < 0) {
            this.showError('current-assets', 'Current assets cannot be negative');
            isValid = false;
        }

        if (inputs.monthlyContributions < 0) {
            this.showError('monthly-contributions', 'Monthly contributions cannot be negative');
            isValid = false;
        }

        return isValid;
    }

    showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorDiv = document.getElementById(fieldId + '-error');
        
        if (field && errorDiv) {
            field.classList.add('error');
            field.setAttribute('aria-invalid', 'true');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    clearErrors() {
        const errorMessages = document.querySelectorAll('.error-message');
        const errorFields = document.querySelectorAll('.error');
        
        errorMessages.forEach(error => {
            error.style.display = 'none';
            error.textContent = '';
        });
        
        errorFields.forEach(field => {
            field.classList.remove('error');
            field.setAttribute('aria-invalid', 'false');
        });
    }

    performCalculations(inputs) {
        const yearsToRetirement = inputs.retirementAge - inputs.currentAge;
        const realReturnRate = inputs.investmentRate - inputs.inflationRate;
        
        const regularFireNumber = inputs.annualSpending / inputs.withdrawalRate;
        
        const coastFireNumber = inputs.annualSpending / (inputs.withdrawalRate * Math.pow(1 + realReturnRate, yearsToRetirement));
        
        
        const currentProgress = (inputs.currentAssets / coastFireNumber) * 100;
        
        let yearsToCoastFire = null;
        let monthlyNeeded = 0;
        
        if (inputs.currentAssets < coastFireNumber) {
            if (inputs.monthlyContributions > 0) {
                yearsToCoastFire = this.calculateYearsToCoastFireWalletBurstMethod(inputs, realReturnRate);
            }
            
            monthlyNeeded = this.calculateMonthlyNeeded(
                inputs.currentAssets,
                regularFireNumber,
                yearsToRetirement,
                realReturnRate
            );
        }

        const projectedGrowth = this.calculateProjectedGrowth(inputs, realReturnRate);

        return {
            regularFireNumber,
            coastFireNumber,
            currentProgress,
            yearsToCoastFire,
            monthlyNeeded,
            yearsToRetirement,
            projectedGrowth,
            isCoastFireAchieved: inputs.currentAssets >= coastFireNumber
        };
    }


    calculateYearsToCoastFireWalletBurstMethod(inputs, realReturnRate) {
        // This method finds when your projected net worth equals the Coast FIRE number for that future age
        let years = 0;
        let currentValue = inputs.currentAssets;
        const monthlyRate = realReturnRate / 12;
        
        while (years <= (inputs.retirementAge - inputs.currentAge)) {
            // Calculate Coast FIRE number needed at this future age
            const yearsToRetirementFromThisPoint = (inputs.retirementAge - inputs.currentAge) - years;
            const coastFireAtThisAge = inputs.annualSpending / (inputs.withdrawalRate * Math.pow(1 + realReturnRate, yearsToRetirementFromThisPoint));
            
            if (currentValue >= coastFireAtThisAge) {
                return years;
            }
            
            // Grow for one year with monthly contributions
            for (let month = 0; month < 12; month++) {
                currentValue += inputs.monthlyContributions;
                currentValue *= (1 + monthlyRate);
            }
            years++;
        }
        
        return null; // Never reached
    }

    calculateMonthlyNeeded(currentAmount, targetAmount, yearsAvailable, returnRate) {
        if (yearsAvailable <= 0) return 0;
        
        const monthlyRate = returnRate / 12;
        const months = yearsAvailable * 12;
        const futureValueCurrent = currentAmount * Math.pow(1 + monthlyRate, months);
        const deficit = targetAmount - futureValueCurrent;
        
        if (deficit <= 0) return 0;
        
        const monthlyNeeded = deficit / (((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate));
        
        return Math.max(0, monthlyNeeded);
    }

    calculateProjectedGrowth(inputs, realReturnRate) {
        const projections = [];
        const monthlyRate = realReturnRate / 12;
        
        for (let age = inputs.currentAge; age <= inputs.retirementAge; age++) {
            const monthsFromStart = (age - inputs.currentAge) * 12;
            
            let futureValue = inputs.currentAssets * Math.pow(1 + monthlyRate, monthsFromStart);
            
            if (inputs.monthlyContributions > 0 && monthsFromStart > 0) {
                const annuityValue = inputs.monthlyContributions * 
                    ((Math.pow(1 + monthlyRate, monthsFromStart) - 1) / monthlyRate);
                futureValue += annuityValue;
            }
            
            const coastFireAtAge = inputs.annualSpending / (inputs.withdrawalRate * Math.pow(1 + realReturnRate, inputs.retirementAge - age));
            
            projections.push({
                age,
                netWorth: futureValue,
                coastFireRequired: coastFireAtAge
            });
        }
        
        return projections;
    }

    updateResults(results) {
        document.getElementById('coast-fire-number').textContent = this.formatCurrency(results.coastFireNumber);
        document.getElementById('regular-fire-number').textContent = this.formatCurrency(results.regularFireNumber);
        document.getElementById('coast-fire-progress').textContent = results.currentProgress.toFixed(1) + '%';
        document.getElementById('years-growth-remaining').textContent = results.yearsToRetirement + ' years';

        const statusElement = document.getElementById('coast-fire-status');
        if (results.isCoastFireAchieved) {
            statusElement.textContent = 'Achieved!';
            statusElement.className = 'result-value status-achieved';
            document.getElementById('years-to-coast-fire').textContent = 'Achieved';
            document.getElementById('monthly-savings-needed').textContent = '$0';
        } else {
            statusElement.textContent = 'In Progress';
            statusElement.className = 'result-value status-in-progress';
            
            if (results.yearsToCoastFire !== null) {
                document.getElementById('years-to-coast-fire').textContent = results.yearsToCoastFire.toFixed(1) + ' years';
            } else {
                document.getElementById('years-to-coast-fire').textContent = 'Never (with current contributions)';
            }
            
            document.getElementById('monthly-savings-needed').textContent = this.formatCurrency(results.monthlyNeeded);
        }
    }

    updateChart(inputs, results) {
        const ctx = document.getElementById('projection-chart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        const ages = results.projectedGrowth.map(p => p.age);
        const netWorthData = results.projectedGrowth.map(p => p.netWorth);
        const coastFireData = results.projectedGrowth.map(p => p.coastFireRequired);

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ages,
                datasets: [{
                    label: 'Projected Net Worth',
                    data: netWorthData,
                    borderColor: '#6b8f47',
                    backgroundColor: 'rgba(107, 143, 71, 0.06)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#6b8f47',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 3
                }, {
                    label: 'Coast FIRE Required',
                    data: coastFireData,
                    borderColor: '#2d2d2d',
                    backgroundColor: 'rgba(45, 45, 45, 0.06)',
                    fill: false,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#2d2d2d',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 3,
                    borderDash: [8, 4]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Age',
                            color: '#6b7280',
                            font: {
                                family: 'Inter',
                                size: 14,
                                weight: 500
                            }
                        },
                        grid: {
                            color: '#f0ede7',
                            borderColor: '#e8e0d6'
                        },
                        ticks: {
                            color: '#6b6b6b',
                            font: {
                                family: 'Inter',
                                size: 12
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Amount ($)',
                            color: '#6b7280',
                            font: {
                                family: 'Inter',
                                size: 14,
                                weight: 500
                            }
                        },
                        grid: {
                            color: '#f0ede7',
                            borderColor: '#e8e0d6'
                        },
                        ticks: {
                            color: '#6b6b6b',
                            font: {
                                family: 'Inter',
                                size: 12
                            },
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        backgroundColor: '#111827',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#374151',
                        borderWidth: 1,
                        cornerRadius: 8,
                        titleFont: {
                            family: 'Inter',
                            size: 14,
                            weight: 600
                        },
                        bodyFont: {
                            family: 'Inter',
                            size: 13
                        },
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': $' + context.parsed.y.toLocaleString();
                            }
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#2d2d2d',
                            font: {
                                family: 'Inter',
                                size: 14,
                                weight: 500
                            },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20
                        }
                    }
                }
            }
        });
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    saveToStorage() {
        const data = {
            currentAge: document.getElementById('current-age').value,
            retirementAge: document.getElementById('retirement-age').value,
            annualSpending: document.getElementById('annual-spending').value,
            currentAssets: document.getElementById('current-assets').value,
            monthlyContributions: document.getElementById('monthly-contributions').value,
            investmentRate: document.getElementById('investment-rate').value,
            inflationRate: document.getElementById('inflation-rate').value,
            withdrawalRate: document.getElementById('withdrawal-rate').value
        };
        
        localStorage.setItem('coastFireCalculatorData', JSON.stringify(data));
    }

    loadFromStorage() {
        const savedData = localStorage.getItem('coastFireCalculatorData');
        if (savedData) {
            const data = JSON.parse(savedData);
            
            Object.keys(data).forEach(key => {
                const element = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
                if (element) {
                    element.value = data[key];
                }
            });
            
            // Update slider display values after loading
            this.updateSliderValues();
        }
    }
}

class MortgageCalculator {
    constructor() {
        this.incomeChart = null;
        this.percentageChart = null;
        this.initializeEventListeners();
        this.loadFromStorage();
        this.calculate();
    }

    initializeEventListeners() {
        const inputs = document.querySelectorAll('#mortgage-form input, #mortgage-form select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateSliderValues();
                this.calculate();
                this.saveToStorage();
            });

            input.addEventListener('change', () => {
                this.updateSliderValues();
                this.calculate();
                this.saveToStorage();
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.calculate();
                }
            });
        });

        this.updateSliderValues();
    }

    updateSliderValues() {
        const salaryIncreaseRate = document.getElementById('salary-increase-rate');
        if (salaryIncreaseRate) {
            document.getElementById('salary-increase-rate-value').textContent = parseFloat(salaryIncreaseRate.value).toFixed(1) + '%';
        }
    }

    getInputValues() {
        return {
            netMonthlyIncome: parseFloat(document.getElementById('net-monthly-income').value),
            monthlyMortgagePayment: parseFloat(document.getElementById('monthly-mortgage-payment').value),
            mortgageLength: parseInt(document.getElementById('mortgage-length').value),
            salaryIncreaseRate: parseFloat(document.getElementById('salary-increase-rate').value) / 100
        };
    }

    calculate() {
        const inputs = this.getInputValues();
        
        if (!this.validateInputs(inputs)) {
            return;
        }

        const results = this.performCalculations(inputs);
        this.updateResults(results);
        
        // Ensure chart canvases exist before updating
        const incomeCanvas = document.getElementById('mortgage-income-chart');
        const percentageCanvas = document.getElementById('mortgage-percentage-chart');
        if (incomeCanvas && percentageCanvas) {
            this.updateCharts(inputs, results);
        }
    }

    validateInputs(inputs) {
        this.clearErrors();
        let isValid = true;

        if (inputs.netMonthlyIncome < 1000 || inputs.netMonthlyIncome > 50000) {
            this.showError('net-monthly-income', 'Net monthly income must be between $1,000 and $50,000');
            isValid = false;
        }

        if (inputs.monthlyMortgagePayment < 500 || inputs.monthlyMortgagePayment > 20000) {
            this.showError('monthly-mortgage-payment', 'Monthly mortgage payment must be between $500 and $20,000');
            isValid = false;
        }

        if (inputs.monthlyMortgagePayment >= inputs.netMonthlyIncome) {
            this.showError('monthly-mortgage-payment', 'Mortgage payment must be less than your net monthly income');
            isValid = false;
        }

        return isValid;
    }

    showError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorDiv = document.getElementById(fieldId + '-error');
        
        if (field && errorDiv) {
            field.classList.add('error');
            field.setAttribute('aria-invalid', 'true');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    clearErrors() {
        const errorMessages = document.querySelectorAll('.error-message');
        const errorFields = document.querySelectorAll('.error');
        
        errorMessages.forEach(error => {
            error.style.display = 'none';
            error.textContent = '';
        });
        
        errorFields.forEach(field => {
            field.classList.remove('error');
            field.setAttribute('aria-invalid', 'false');
        });
    }

    performCalculations(inputs) {
        const dataPoints = [];
        const milestones = { '30': null, '25': null, '20': null };
        
        for (let year = 0; year <= inputs.mortgageLength; year++) {
            const currentIncome = inputs.netMonthlyIncome * Math.pow(1 + inputs.salaryIncreaseRate, year);
            const percentage = (inputs.monthlyMortgagePayment / currentIncome) * 100;
            
            dataPoints.push({
                year: year,
                income: currentIncome,
                percentage: percentage,
                mortgagePayment: inputs.monthlyMortgagePayment
            });

            // Check for milestones
            Object.keys(milestones).forEach(threshold => {
                if (milestones[threshold] === null && percentage <= parseFloat(threshold)) {
                    milestones[threshold] = year;
                }
            });
        }

        const startPercentage = dataPoints[0].percentage;
        const endPercentage = dataPoints[dataPoints.length - 1].percentage;
        const totalReduction = startPercentage - endPercentage;
        const finalIncome = dataPoints[dataPoints.length - 1].income;

        return {
            dataPoints,
            startPercentage,
            endPercentage,
            totalReduction,
            finalIncome,
            milestones
        };
    }

    updateResults(results) {
        document.getElementById('mortgage-start-percentage').textContent = results.startPercentage.toFixed(1) + '%';
        document.getElementById('mortgage-end-percentage').textContent = results.endPercentage.toFixed(1) + '%';
        document.getElementById('mortgage-total-reduction').textContent = results.totalReduction.toFixed(1) + ' percentage points';
        document.getElementById('final-income').textContent = this.formatCurrency(results.finalIncome);

        // Update milestones
        document.getElementById('milestone-30').textContent = results.milestones['30'] !== null ? `Year ${results.milestones['30']}` : 'Never';
        document.getElementById('milestone-25').textContent = results.milestones['25'] !== null ? `Year ${results.milestones['25']}` : 'Never';
        document.getElementById('milestone-20').textContent = results.milestones['20'] !== null ? `Year ${results.milestones['20']}` : 'Never';
    }

    updateCharts(inputs, results) {
        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded');
            return;
        }

        this.updateIncomeChart(inputs, results);
        this.updatePercentageChart(inputs, results);
    }

    updateIncomeChart(inputs, results) {
        const ctx = document.getElementById('mortgage-income-chart').getContext('2d');
        
        if (this.incomeChart) {
            this.incomeChart.destroy();
        }

        const years = results.dataPoints.map(p => p.year);
        const incomes = results.dataPoints.map(p => p.income);
        const mortgagePayments = results.dataPoints.map(p => p.mortgagePayment);

        // Create gradient for income bars
        const incomeGradient = ctx.createLinearGradient(0, 0, 0, 400);
        incomeGradient.addColorStop(0, '#3b82f6');
        incomeGradient.addColorStop(1, '#1d4ed8');

        try {
            this.incomeChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: years,
                    datasets: [
                        {
                            label: 'Monthly Income',
                            data: incomes,
                            backgroundColor: incomeGradient,
                            borderColor: '#1d4ed8',
                            borderWidth: 1
                        },
                        {
                            label: 'Mortgage Payment',
                            data: mortgagePayments,
                            backgroundColor: '#f59e0b',
                            borderColor: '#d97706',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Years',
                                color: '#6b7280',
                                font: {
                                    family: 'Inter',
                                    size: 14,
                                    weight: 500
                                }
                            },
                            grid: {
                                color: '#f0ede7'
                            },
                            ticks: {
                                color: '#6b6b6b'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Dollar Amount ($)',
                                color: '#6b7280',
                                font: {
                                    family: 'Inter',
                                    size: 14,
                                    weight: 500
                                }
                            },
                            grid: {
                                color: '#f0ede7'
                            },
                            ticks: {
                                color: '#6b6b6b',
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            backgroundColor: '#111827',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#374151',
                            borderWidth: 1,
                            cornerRadius: 8,
                            callbacks: {
                                title: function(context) {
                                    return 'Year ' + context[0].label;
                                },
                                label: function(context) {
                                    const dataIndex = context.dataIndex;
                                    const dataPoint = results.dataPoints[dataIndex];
                                    const dataset = context.dataset;
                                    
                                    if (dataset.label === 'Monthly Income') {
                                        const growth = dataPoint.income - results.dataPoints[0].income;
                                        return 'Monthly Income: $' + dataPoint.income.toLocaleString() + 
                                               ' (+$' + growth.toLocaleString() + ' growth)';
                                    } else if (dataset.label === 'Mortgage Payment') {
                                        return 'Mortgage Payment: $' + dataPoint.mortgagePayment.toLocaleString() + ' (fixed)';
                                    }
                                }
                            }
                        },
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: '#2d2d2d',
                                font: {
                                    family: 'Inter',
                                    size: 13,
                                    weight: 500
                                },
                                usePointStyle: true,
                                padding: 15
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating income chart:', error);
        }
    }

    updatePercentageChart(inputs, results) {
        const ctx = document.getElementById('mortgage-percentage-chart').getContext('2d');
        
        if (this.percentageChart) {
            this.percentageChart.destroy();
        }

        const years = results.dataPoints.map(p => p.year);
        const percentages = results.dataPoints.map(p => p.percentage);

        // Create gradient for the line based on values
        const lineGradient = ctx.createLinearGradient(0, 0, 0, 400);
        lineGradient.addColorStop(0, '#ef4444'); // Red for high percentages
        lineGradient.addColorStop(0.6, '#f59e0b'); // Orange for medium
        lineGradient.addColorStop(1, '#10b981'); // Green for low percentages

        try {
            this.percentageChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: years,
                    datasets: [{
                        label: 'Mortgage as % of Income',
                        data: percentages,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 5,
                        pointBackgroundColor: function(context) {
                            const value = context.parsed.y;
                            if (value > 30) return '#ef4444';
                            if (value > 20) return '#f59e0b';
                            return '#10b981';
                        },
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Years',
                                color: '#6b7280',
                                font: {
                                    family: 'Inter',
                                    size: 14,
                                    weight: 500
                                }
                            },
                            grid: {
                                color: '#f0ede7'
                            },
                            ticks: {
                                color: '#6b6b6b'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Mortgage as % of Income',
                                color: '#6b7280',
                                font: {
                                    family: 'Inter',
                                    size: 14,
                                    weight: 500
                                }
                            },
                            grid: {
                                color: '#f0ede7'
                            },
                            ticks: {
                                color: '#6b6b6b',
                                callback: function(value) {
                                    return value.toFixed(1) + '%';
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            backgroundColor: '#111827',
                            titleColor: '#ffffff',
                            bodyColor: '#ffffff',
                            borderColor: '#374151',
                            borderWidth: 1,
                            cornerRadius: 8,
                            callbacks: {
                                title: function(context) {
                                    return 'Year ' + context[0].label;
                                },
                                label: function(context) {
                                    const dataIndex = context.dataIndex;
                                    const dataPoint = results.dataPoints[dataIndex];
                                    const reduction = results.dataPoints[0].percentage - dataPoint.percentage;
                                    
                                    return [
                                        'Mortgage Percentage: ' + dataPoint.percentage.toFixed(1) + '%',
                                        'Reduction from start: ' + reduction.toFixed(1) + ' points',
                                        'Monthly Income: $' + dataPoint.income.toLocaleString(),
                                        'Mortgage Payment: $' + dataPoint.mortgagePayment.toLocaleString()
                                    ];
                                }
                            }
                        },
                        legend: {
                            display: false
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating percentage chart:', error);
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    saveToStorage() {
        const data = {
            netMonthlyIncome: document.getElementById('net-monthly-income').value,
            monthlyMortgagePayment: document.getElementById('monthly-mortgage-payment').value,
            mortgageLength: document.getElementById('mortgage-length').value,
            salaryIncreaseRate: document.getElementById('salary-increase-rate').value
        };
        
        localStorage.setItem('mortgageCalculatorData', JSON.stringify(data));
    }

    loadFromStorage() {
        const savedData = localStorage.getItem('mortgageCalculatorData');
        if (savedData) {
            const data = JSON.parse(savedData);
            
            Object.keys(data).forEach(key => {
                const element = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
                if (element) {
                    element.value = data[key];
                }
            });
            
            this.updateSliderValues();
        }
    }
}

class AppManager {
    constructor() {
        this.coastFireCalculator = null;
        this.mortgageCalculator = null;
        this.currentCalculator = this.loadActiveCalculator();
        
        this.initializeNavigation();
        this.restoreCalculatorState();
        this.initializeCalculators();
    }

    initializeNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const calculator = e.target.getAttribute('data-calculator');
                this.switchCalculator(calculator);
            });
        });
    }

    switchCalculator(calculator) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-calculator="${calculator}"]`).classList.add('active');

        // Update calculator sections
        document.querySelectorAll('.calculator-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${calculator}-calculator`).classList.add('active');

        this.currentCalculator = calculator;
        this.saveActiveCalculator(calculator);
    }

    saveActiveCalculator(calculator) {
        try {
            localStorage.setItem('activeCalculator', calculator);
        } catch (error) {
            console.warn('Failed to save active calculator to localStorage:', error);
        }
    }

    loadActiveCalculator() {
        try {
            const saved = localStorage.getItem('activeCalculator');
            // Validate the saved calculator exists
            if (saved === 'coast-fire' || saved === 'mortgage') {
                return saved;
            }
        } catch (error) {
            console.warn('Failed to load active calculator from localStorage:', error);
        }
        // Default to coast-fire if nothing saved or invalid value
        return 'coast-fire';
    }

    restoreCalculatorState() {
        // Set the correct navigation button as active
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-calculator="${this.currentCalculator}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Set the correct calculator section as active
        document.querySelectorAll('.calculator-section').forEach(section => {
            section.classList.remove('active');
        });
        const activeSection = document.getElementById(`${this.currentCalculator}-calculator`);
        if (activeSection) {
            activeSection.classList.add('active');
        }
    }

    initializeCalculators() {
        this.coastFireCalculator = new CoastFireCalculator();
        this.mortgageCalculator = new MortgageCalculator();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    new AppManager();
});