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

        // Range analysis toggle
        const enableRangeAnalysis = document.getElementById('enable-range-analysis');
        enableRangeAnalysis.addEventListener('change', () => {
            this.toggleRangeAnalysis();
            this.calculate();
            this.saveToStorage();
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
        const rateRange = document.getElementById('rate-range');

        document.getElementById('investment-rate-value').textContent = parseFloat(investmentRate.value).toFixed(1) + '%';
        document.getElementById('inflation-rate-value').textContent = parseFloat(inflationRate.value).toFixed(1) + '%';
        document.getElementById('withdrawal-rate-value').textContent = parseFloat(withdrawalRate.value).toFixed(1) + '%';
        
        if (rateRange) {
            document.getElementById('rate-range-value').textContent = parseFloat(rateRange.value).toFixed(1) + '%';
            this.updateScenarioPreview();
        }
    }

    updateScenarioPreview() {
        const investmentRate = parseFloat(document.getElementById('investment-rate').value);
        const rateRange = parseFloat(document.getElementById('rate-range').value);
        
        const conservativeRate = Math.max(1, investmentRate - rateRange);
        const expectedRate = investmentRate;
        const optimisticRate = Math.min(20, investmentRate + rateRange);
        
        document.getElementById('conservative-rate').textContent = conservativeRate.toFixed(1) + '%';
        document.getElementById('expected-rate').textContent = expectedRate.toFixed(1) + '%';
        document.getElementById('optimistic-rate').textContent = optimisticRate.toFixed(1) + '%';
        
        // Update scenario rate displays in results
        document.getElementById('conservative-scenario-rate').textContent = `(${conservativeRate.toFixed(1)}%)`;
        document.getElementById('expected-scenario-rate').textContent = `(${expectedRate.toFixed(1)}%)`;
        document.getElementById('optimistic-scenario-rate').textContent = `(${optimisticRate.toFixed(1)}%)`;
        
        // Update help text
        const helpText = document.getElementById('rate-range-help');
        if (helpText) {
            helpText.textContent = `Market returns vary ±${rateRange.toFixed(1)}% around your expected return (e.g., ${conservativeRate.toFixed(1)}%-${optimisticRate.toFixed(1)}% scenarios)`;
        }
    }

    toggleRangeAnalysis() {
        const enableCheckbox = document.getElementById('enable-range-analysis');
        const rangeContainer = document.getElementById('range-slider-container');
        const singleResults = document.getElementById('single-scenario-results');
        const scenarioResults = document.getElementById('scenario-analysis-results');
        
        if (enableCheckbox.checked) {
            rangeContainer.style.display = 'block';
            singleResults.style.display = 'none';
            scenarioResults.style.display = 'block';
        } else {
            rangeContainer.style.display = 'none';
            singleResults.style.display = 'block';
            scenarioResults.style.display = 'none';
        }
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
            withdrawalRate: parseFloat(document.getElementById('withdrawal-rate').value) / 100,
            enableRangeAnalysis: document.getElementById('enable-range-analysis').checked,
            rateRange: parseFloat(document.getElementById('rate-range').value) / 100
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
        if (inputs.enableRangeAnalysis) {
            return this.performScenarioCalculations(inputs);
        } else {
            return this.performSingleScenarioCalculation(inputs);
        }
    }

    performSingleScenarioCalculation(inputs) {
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
            singleScenario: {
                regularFireNumber,
                coastFireNumber,
                currentProgress,
                yearsToCoastFire,
                monthlyNeeded,
                yearsToRetirement,
                projectedGrowth,
                isCoastFireAchieved: inputs.currentAssets >= coastFireNumber
            }
        };
    }

    performScenarioCalculations(inputs) {
        const conservativeRate = Math.max(0.01, inputs.investmentRate - inputs.rateRange);
        const expectedRate = inputs.investmentRate;
        const optimisticRate = Math.min(0.20, inputs.investmentRate + inputs.rateRange);
        
        const scenarios = {
            conservative: this.calculateScenario({...inputs, investmentRate: conservativeRate}),
            expected: this.calculateScenario({...inputs, investmentRate: expectedRate}),
            optimistic: this.calculateScenario({...inputs, investmentRate: optimisticRate})
        };
        
        return {
            scenarios
        };
    }

    calculateScenario(inputs) {
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
            investmentRate: inputs.investmentRate,
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
        if (results.singleScenario) {
            this.updateSingleScenarioResults(results.singleScenario);
        } else if (results.scenarios) {
            this.updateScenarioResults(results);
        }
    }

    updateSingleScenarioResults(results) {
        document.getElementById('coast-fire-number').textContent = this.formatCurrency(results.coastFireNumber);
        document.getElementById('expected-coast-fire-additional').textContent = this.formatCurrency(results.coastFireNumber);
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

    updateScenarioResults(results) {
        const scenarios = results.scenarios;
        
        // Update conservative scenario
        document.getElementById('conservative-coast-fire').textContent = this.formatCurrency(scenarios.conservative.coastFireNumber);
        document.getElementById('conservative-progress').textContent = scenarios.conservative.currentProgress.toFixed(1) + '%';
        document.getElementById('conservative-timeline').textContent = this.formatScenarioTimeline(scenarios.conservative);
        
        // Update expected scenario
        document.getElementById('expected-coast-fire').textContent = this.formatCurrency(scenarios.expected.coastFireNumber);
        document.getElementById('expected-progress').textContent = scenarios.expected.currentProgress.toFixed(1) + '%';
        document.getElementById('expected-timeline').textContent = this.formatScenarioTimeline(scenarios.expected);
        
        // Update optimistic scenario
        document.getElementById('optimistic-coast-fire').textContent = this.formatCurrency(scenarios.optimistic.coastFireNumber);
        document.getElementById('optimistic-progress').textContent = scenarios.optimistic.currentProgress.toFixed(1) + '%';
        document.getElementById('optimistic-timeline').textContent = this.formatScenarioTimeline(scenarios.optimistic);
        
        
        // Update secondary results with expected scenario data
        document.getElementById('expected-coast-fire-additional').textContent = this.formatCurrency(scenarios.expected.coastFireNumber);
        document.getElementById('regular-fire-number').textContent = this.formatCurrency(scenarios.expected.regularFireNumber);
        document.getElementById('years-to-coast-fire').textContent = scenarios.expected.yearsToCoastFire 
            ? scenarios.expected.yearsToCoastFire.toFixed(1) + ' years' 
            : 'Never';
        document.getElementById('monthly-savings-needed').textContent = this.formatCurrency(scenarios.expected.monthlyNeeded);
        document.getElementById('years-growth-remaining').textContent = scenarios.expected.yearsToRetirement + ' years';
    }

    updateChart(inputs, results) {
        const ctx = document.getElementById('projection-chart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        if (results.singleScenario) {
            this.createSingleScenarioChart(ctx, results.singleScenario);
        } else if (results.scenarios) {
            this.createScenarioChart(ctx, results.scenarios);
        }
    }

    createSingleScenarioChart(ctx, results) {
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

    formatScenarioTimeline(scenario) {
        if (scenario.isCoastFireAchieved) {
            return 'Achieved';
        } else if (scenario.yearsToCoastFire !== null) {
            return scenario.yearsToCoastFire.toFixed(1) + ' years';
        } else {
            return 'Never';
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

    createScenarioChart(ctx, scenarios) {
        const ages = scenarios.expected.projectedGrowth.map(p => p.age);
        const conservativeData = scenarios.conservative.projectedGrowth.map(p => p.netWorth);
        const expectedData = scenarios.expected.projectedGrowth.map(p => p.netWorth);
        const optimisticData = scenarios.optimistic.projectedGrowth.map(p => p.netWorth);
        const coastFireData = scenarios.expected.projectedGrowth.map(p => p.coastFireRequired);

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ages,
                datasets: [{
                    label: 'Conservative Scenario',
                    data: conservativeData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    borderDash: [5, 5]
                }, {
                    label: 'Expected Scenario',
                    data: expectedData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: '+1',
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 8
                }, {
                    label: 'Optimistic Scenario',
                    data: optimisticData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: '-1',
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    borderDash: [5, 5]
                }, {
                    label: 'Coast FIRE Required',
                    data: coastFireData,
                    borderColor: '#2d2d2d',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 8,
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

    saveToStorage() {
        const data = {
            currentAge: document.getElementById('current-age').value,
            retirementAge: document.getElementById('retirement-age').value,
            annualSpending: document.getElementById('annual-spending').value,
            currentAssets: document.getElementById('current-assets').value,
            monthlyContributions: document.getElementById('monthly-contributions').value,
            investmentRate: document.getElementById('investment-rate').value,
            inflationRate: document.getElementById('inflation-rate').value,
            withdrawalRate: document.getElementById('withdrawal-rate').value,
            enableRangeAnalysis: document.getElementById('enable-range-analysis').checked,
            rateRange: document.getElementById('rate-range').value
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
                    if (element.type === 'checkbox') {
                        element.checked = data[key];
                    } else {
                        element.value = data[key];
                    }
                }
            });
            
            // Update slider display values after loading
            this.updateSliderValues();
            
            // Initialize range analysis toggle state
            this.toggleRangeAnalysis();
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

class TraditionalFireCalculator {
    constructor() {
        this.chart = null;
        this.initializeEventListeners();
        this.loadFromStorage();
        this.calculate();
    }

    initializeEventListeners() {
        const inputs = document.querySelectorAll('#traditional-fire-form input');
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
        const expectedReturnRate = document.getElementById('expected-return-rate');
        const fireInflationRate = document.getElementById('fire-inflation-rate');
        const safeWithdrawalRate = document.getElementById('safe-withdrawal-rate');

        if (expectedReturnRate) {
            document.getElementById('expected-return-rate-value').textContent = parseFloat(expectedReturnRate.value).toFixed(1) + '%';
        }
        if (fireInflationRate) {
            document.getElementById('fire-inflation-rate-value').textContent = parseFloat(fireInflationRate.value).toFixed(1) + '%';
        }
        if (safeWithdrawalRate) {
            document.getElementById('safe-withdrawal-rate-value').textContent = parseFloat(safeWithdrawalRate.value).toFixed(1) + '%';
        }
    }

    getInputValues() {
        return {
            yearlySpending: parseFloat(document.getElementById('yearly-spending').value),
            monthlyInvestments: parseFloat(document.getElementById('monthly-investments').value),
            currentInvestedAssets: parseFloat(document.getElementById('current-invested-assets').value),
            expectedReturnRate: parseFloat(document.getElementById('expected-return-rate').value) / 100,
            inflationRate: parseFloat(document.getElementById('fire-inflation-rate').value) / 100,
            safeWithdrawalRate: parseFloat(document.getElementById('safe-withdrawal-rate').value) / 100
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

        if (inputs.yearlySpending < 15000 || inputs.yearlySpending > 500000) {
            this.showError('yearly-spending', 'Yearly spending must be between $15,000 and $500,000');
            isValid = false;
        }

        if (inputs.monthlyInvestments < 100 || inputs.monthlyInvestments > 50000) {
            this.showError('monthly-investments', 'Monthly investments must be between $100 and $50,000');
            isValid = false;
        }

        if (inputs.currentInvestedAssets < 0 || inputs.currentInvestedAssets > 10000000) {
            this.showError('current-invested-assets', 'Current invested assets must be between $0 and $10,000,000');
            isValid = false;
        }

        if (inputs.expectedReturnRate <= inputs.inflationRate) {
            this.showError('expected-return-rate', 'Expected return rate must be higher than inflation rate');
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
        const realReturnRate = inputs.expectedReturnRate - inputs.inflationRate;
        
        // Calculate FIRE number
        const fireNumber = inputs.yearlySpending / inputs.safeWithdrawalRate;
        
        // Calculate time to FIRE
        const timeToFire = this.calculateTimeToFIRE(
            inputs.currentInvestedAssets,
            inputs.monthlyInvestments,
            fireNumber,
            realReturnRate
        );
        
        // Calculate current progress
        const currentProgress = (inputs.currentInvestedAssets / fireNumber) * 100;
        
        // Calculate monthly retirement income
        const monthlyRetirementIncome = inputs.yearlySpending / 12;
        
        // Calculate total contributions and investment growth
        const totalContributions = timeToFire.achievable ? 
            inputs.monthlyInvestments * timeToFire.totalMonths : 
            inputs.monthlyInvestments * 600; // 50 years worth
        const projectedPortfolioValue = timeToFire.achievable ? fireNumber : this.calculateFutureValue(inputs, realReturnRate, 50);
        const investmentGrowth = Math.max(0, projectedPortfolioValue - inputs.currentInvestedAssets - totalContributions);
        
        // Generate projection data for chart
        const projectionData = this.generateProjectionData(inputs, realReturnRate, timeToFire.years);

        return {
            fireNumber,
            timeToFire,
            currentProgress,
            monthlyRetirementIncome,
            projectedPortfolioValue,
            totalContributions,
            investmentGrowth,
            projectionData
        };
    }

    calculateTimeToFIRE(currentAssets, monthlyInvestment, fireNumber, realReturnRate) {
        const annualContribution = monthlyInvestment * 12;
        let years = 0;
        let currentValue = currentAssets;
        
        // Check if already at FIRE
        if (currentValue >= fireNumber) {
            return { years: 0, months: 0, totalMonths: 0, achievable: true };
        }
        
        // Iterative calculation up to 50 years
        while (currentValue < fireNumber && years < 50) {
            currentValue = currentValue * (1 + realReturnRate) + annualContribution;
            years++;
        }
        
        if (years >= 50) {
            return { years: 50, months: 0, totalMonths: 600, achievable: false };
        }
        
        // Refine to monthly precision for the final year
        currentValue = currentAssets;
        for (let year = 0; year < years - 1; year++) {
            currentValue = currentValue * (1 + realReturnRate) + annualContribution;
        }
        
        const monthlyRate = realReturnRate / 12;
        let months = 0;
        
        while (currentValue < fireNumber && months < 12) {
            currentValue += monthlyInvestment;
            currentValue *= (1 + monthlyRate);
            months++;
        }
        
        return { 
            years: years - 1 + (months / 12), 
            months: months, 
            totalMonths: (years - 1) * 12 + months,
            achievable: true 
        };
    }

    calculateFutureValue(inputs, realReturnRate, years) {
        let value = inputs.currentInvestedAssets;
        const annualContribution = inputs.monthlyInvestments * 12;
        
        for (let year = 0; year < years; year++) {
            value = value * (1 + realReturnRate) + annualContribution;
        }
        
        return value;
    }

    generateProjectionData(inputs, realReturnRate, maxYears) {
        const data = [];
        const years = Math.min(maxYears + 5, 50);
        let currentValue = inputs.currentInvestedAssets;
        
        for (let year = 0; year <= years; year++) {
            data.push({
                year: year,
                portfolioValue: currentValue
            });
            
            if (year < years) {
                currentValue = currentValue * (1 + realReturnRate) + (inputs.monthlyInvestments * 12);
            }
        }
        
        return data;
    }

    updateResults(results) {
        // Update main timeline display
        if (results.timeToFire.achievable) {
            if (results.timeToFire.years === 0) {
                document.getElementById('fire-timeline').textContent = 'Achieved!';
            } else {
                const years = Math.floor(results.timeToFire.years);
                const months = Math.round((results.timeToFire.years - years) * 12);
                document.getElementById('fire-timeline').textContent = `${years} years, ${months} months`;
            }
        } else {
            document.getElementById('fire-timeline').textContent = '50+ years';
        }
        
        document.getElementById('fire-number').textContent = this.formatCurrency(results.fireNumber);
        document.getElementById('monthly-retirement-income').textContent = this.formatCurrency(results.monthlyRetirementIncome);
        document.getElementById('current-progress').textContent = results.currentProgress.toFixed(1) + '%';
        document.getElementById('projected-portfolio-value').textContent = this.formatCurrency(results.projectedPortfolioValue);
        document.getElementById('total-contributions').textContent = this.formatCurrency(results.totalContributions);
        document.getElementById('investment-growth').textContent = this.formatCurrency(results.investmentGrowth);
    }

    updateChart(inputs, results) {
        const ctx = document.getElementById('fire-projection-chart').getContext('2d');
        
        if (this.chart) {
            this.chart.destroy();
        }

        const years = results.projectionData.map(p => p.year);
        const portfolioValues = results.projectionData.map(p => p.portfolioValue);
        const fireLineData = new Array(results.projectionData.length).fill(results.fireNumber);

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Portfolio Value',
                    data: portfolioValues,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#10b981',
                    pointHoverBorderColor: '#ffffff',
                    pointHoverBorderWidth: 3
                }, {
                    label: 'FIRE Number',
                    data: fireLineData,
                    borderColor: '#ef4444',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0,
                    borderWidth: 2,
                    pointRadius: 0,
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
                            text: 'Years',
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
                            text: 'Portfolio Value ($)',
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
            yearlySpending: document.getElementById('yearly-spending').value,
            monthlyInvestments: document.getElementById('monthly-investments').value,
            currentInvestedAssets: document.getElementById('current-invested-assets').value,
            expectedReturnRate: document.getElementById('expected-return-rate').value,
            fireInflationRate: document.getElementById('fire-inflation-rate').value,
            safeWithdrawalRate: document.getElementById('safe-withdrawal-rate').value
        };
        
        localStorage.setItem('traditionalFireCalculatorData', JSON.stringify(data));
    }

    loadFromStorage() {
        const savedData = localStorage.getItem('traditionalFireCalculatorData');
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

class YearOverYearGrowthCalculator {
    constructor() {
        this.initializeEventListeners();
        this.loadFromStorage();
        this.calculate();
    }

    initializeEventListeners() {
        const inputs = document.querySelectorAll('#year-growth-form input');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
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
    }

    getInputValues() {
        return {
            startingAmount: parseFloat(document.getElementById('starting-amount').value) || 0,
            endingAmount: parseFloat(document.getElementById('ending-amount').value) || 0,
            numberOfYears: parseFloat(document.getElementById('number-of-years').value) || 0
        };
    }

    validateInputs(inputs) {
        const errors = {};

        if (inputs.startingAmount <= 0) {
            errors.startingAmount = 'Starting amount must be greater than zero';
        }

        if (inputs.endingAmount <= 0) {
            errors.endingAmount = 'Ending amount must be greater than zero';
        }

        if (inputs.numberOfYears <= 0) {
            errors.numberOfYears = 'Number of years must be greater than zero';
        }

        if (inputs.numberOfYears > 100) {
            errors.numberOfYears = 'Number of years cannot exceed 100';
        }

        // Check for unrealistic growth rates
        if (inputs.startingAmount > 0 && inputs.endingAmount > 0 && inputs.numberOfYears > 0) {
            const growthRatio = inputs.endingAmount / inputs.startingAmount;
            const annualGrowthRate = Math.pow(growthRatio, 1 / inputs.numberOfYears) - 1;
            
            if (Math.abs(annualGrowthRate) > 10) { // >1000% annual growth
                errors.general = 'This represents extremely high growth (>1000% annually). Please verify your inputs.';
            }
        }

        return errors;
    }

    displayErrors(errors) {
        this.clearErrors();

        Object.keys(errors).forEach(field => {
            if (field === 'general') {
                // Display general errors in the first available error element
                const firstErrorElement = document.querySelector('#year-growth-form .error-message');
                if (firstErrorElement) {
                    firstErrorElement.textContent = errors[field];
                }
            } else {
                const errorElement = document.getElementById(`${field.replace(/([A-Z])/g, '-$1').toLowerCase()}-error`);
                const inputElement = document.getElementById(field.replace(/([A-Z])/g, '-$1').toLowerCase());
                
                if (errorElement && inputElement) {
                    errorElement.textContent = errors[field];
                    inputElement.setAttribute('aria-invalid', 'true');
                }
            }
        });
    }

    clearErrors() {
        const errorElements = document.querySelectorAll('#year-growth-form .error-message');
        const inputElements = document.querySelectorAll('#year-growth-form input');
        
        errorElements.forEach(element => {
            element.textContent = '';
        });
        
        inputElements.forEach(element => {
            element.setAttribute('aria-invalid', 'false');
        });
    }

    calculateYearOverYearGrowth(startingAmount, endingAmount, numberOfYears) {
        if (startingAmount <= 0 || endingAmount <= 0 || numberOfYears <= 0) {
            throw new Error('All values must be positive');
        }

        const growthRatio = endingAmount / startingAmount;
        const annualGrowthRate = Math.pow(growthRatio, 1 / numberOfYears) - 1;
        
        const totalGrowthPercentage = ((endingAmount - startingAmount) / startingAmount) * 100;
        const totalDollarChange = endingAmount - startingAmount;
        const monthlyGrowthRate = Math.pow(1 + annualGrowthRate, 1/12) - 1;

        return {
            annualGrowthRate: annualGrowthRate * 100,
            totalGrowthPercentage,
            totalDollarChange,
            monthlyGrowthRate: monthlyGrowthRate * 100,
            isPositiveGrowth: annualGrowthRate > 0,
            isExceptionalGrowth: Math.abs(annualGrowthRate) > 0.15
        };
    }

    getGrowthClassification(growthRate) {
        const absRate = Math.abs(growthRate);
        
        if (growthRate < 0) {
            return { text: 'Negative Growth', className: 'negative' };
        } else if (absRate <= 3) {
            return { text: 'Conservative Growth', className: 'conservative' };
        } else if (absRate <= 7) {
            return { text: 'Moderate Growth', className: 'moderate' };
        } else if (absRate <= 12) {
            return { text: 'Strong Growth', className: 'strong' };
        } else {
            return { text: 'Exceptional Growth', className: 'exceptional' };
        }
    }

    formatAmount(amount) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    }

    formatPercentage(value) {
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    }

    updateResults(results) {
        // Animate the growth rate update
        const growthRateElement = document.getElementById('annual-growth-rate');
        growthRateElement.classList.add('updating');
        setTimeout(() => growthRateElement.classList.remove('updating'), 300);

        // Update growth rate display
        const growthValue = document.getElementById('growth-value');
        const growthArrow = document.getElementById('growth-arrow');
        const growthRate = document.getElementById('annual-growth-rate');

        growthValue.textContent = this.formatPercentage(results.annualGrowthRate);
        
        // Update arrow and colors based on growth direction
        if (results.isPositiveGrowth) {
            growthArrow.textContent = '↗';
            growthRate.className = 'growth-rate';
        } else if (results.annualGrowthRate < 0) {
            growthArrow.textContent = '↘';
            growthRate.className = 'growth-rate negative';
        } else {
            growthArrow.textContent = '→';
            growthRate.className = 'growth-rate neutral';
        }

        // Update growth classification
        const classification = this.getGrowthClassification(results.annualGrowthRate);
        const classificationElement = document.getElementById('growth-classification');
        classificationElement.textContent = classification.text;
        classificationElement.className = `growth-classification ${classification.className}`;

        // Update secondary metrics
        const totalGrowthElement = document.getElementById('total-growth-percentage');
        totalGrowthElement.textContent = this.formatPercentage(results.totalGrowthPercentage);
        totalGrowthElement.className = results.isPositiveGrowth ? 'result-value positive' : 'result-value negative';

        const dollarChangeElement = document.getElementById('total-dollar-change');
        const changeText = results.totalDollarChange >= 0 ? '+' : '';
        dollarChangeElement.textContent = changeText + this.formatAmount(results.totalDollarChange);
        dollarChangeElement.className = results.isPositiveGrowth ? 'result-value positive' : 'result-value negative';

        document.getElementById('monthly-growth-rate').textContent = this.formatPercentage(results.monthlyGrowthRate);
    }

    calculate() {
        const inputs = this.getInputValues();
        const errors = this.validateInputs(inputs);

        if (Object.keys(errors).length > 0) {
            this.displayErrors(errors);
            return;
        }

        this.clearErrors();

        try {
            const results = this.calculateYearOverYearGrowth(
                inputs.startingAmount,
                inputs.endingAmount,
                inputs.numberOfYears
            );

            this.updateResults(results);
        } catch (error) {
            console.error('Calculation error:', error);
            this.displayErrors({ general: 'An error occurred during calculation. Please check your inputs.' });
        }
    }

    saveToStorage() {
        try {
            const inputs = this.getInputValues();
            const data = {
                startingAmount: inputs.startingAmount,
                endingAmount: inputs.endingAmount,
                numberOfYears: inputs.numberOfYears
            };
            localStorage.setItem('yearGrowthCalculatorData', JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('yearGrowthCalculatorData');
            if (saved) {
                const data = JSON.parse(saved);
                
                document.getElementById('starting-amount').value = data.startingAmount || 10000;
                document.getElementById('ending-amount').value = data.endingAmount || 15000;
                document.getElementById('number-of-years').value = data.numberOfYears || 5;
            }
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
        }
    }
}

class AppManager {
    constructor() {
        this.coastFireCalculator = null;
        this.traditionalFireCalculator = null;
        this.mortgageCalculator = null;
        this.yearGrowthCalculator = null;
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
            if (saved === 'coast-fire' || saved === 'traditional-fire' || saved === 'mortgage' || saved === 'year-growth') {
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
        this.traditionalFireCalculator = new TraditionalFireCalculator();
        this.mortgageCalculator = new MortgageCalculator();
        this.yearGrowthCalculator = new YearOverYearGrowthCalculator();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    new AppManager();
});