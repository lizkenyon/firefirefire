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

document.addEventListener('DOMContentLoaded', function() {
    new CoastFireCalculator();
});