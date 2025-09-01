import { useState, useEffect, useMemo, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts'
import * as math from 'mathjs'
import './App.css'

function App() {
  const [data, setData] = useState('')
  const [dataArray, setDataArray] = useState([])
  const [statistics, setStatistics] = useState({})
  const [error, setError] = useState('')
  const [isCalculating, setIsCalculating] = useState(false)

  const handleDataInput = (e) => {
    const input = e.target.value
    setData(input)
    // Clear previous results when input changes
    setStatistics({})
    setDataArray([])
    setError('')
  }

  const handleCalculate = useCallback(() => {
    if (!data.trim()) {
      setError('Please enter some data first')
      return
    }

    try {
      setIsCalculating(true)
      setError('')
      
      // Parse comma-separated or space-separated numbers
      const numbers = data
        .split(/[,\s]+/)
        .map(s => s.trim())
        .filter(s => s !== '')
        .map(s => parseFloat(s))
        .filter(n => !isNaN(n))
      
      if (numbers.length === 0) {
        setError('Please enter valid numbers')
        setDataArray([])
        setStatistics({})
        return
      }
      
      // Limit data size for performance
      if (numbers.length > 1000) {
        setError('Too many data points. Please limit to 1000 or fewer numbers.')
        setDataArray([])
        setStatistics({})
        return
      }
      
      setDataArray(numbers)
    } catch (err) {
      setError('Invalid data format. Please use comma or space separated numbers.')
      setDataArray([])
      setStatistics({})
    } finally {
      setIsCalculating(false)
    }
  }, [data])

  // Memoized statistics calculation
  const calculatedStats = useMemo(() => {
    if (dataArray.length === 0) return {}

    try {
      const n = dataArray.length
      const mean = math.mean(dataArray)
      const variance = math.variance(dataArray)
      const stdDev = math.std(dataArray)
      
      // Calculate skewness using the formula: E[(X-μ)³] / σ³
      const skewness = math.mean(dataArray.map(x => math.pow((x - mean) / stdDev, 3)))
      
      // Calculate percentiles
      const sortedData = [...dataArray].sort((a, b) => a - b)
      const q1 = sortedData[Math.floor(n * 0.25)]
      const median = sortedData[Math.floor(n * 0.5)]
      const q3 = sortedData[Math.floor(n * 0.75)]
      
      return {
        count: n,
        mean: mean.toFixed(4),
        median: median.toFixed(4),
        stdDev: stdDev.toFixed(4),
        variance: variance.toFixed(4),
        skewness: skewness.toFixed(4),
        q1: q1.toFixed(4),
        q3: q3.toFixed(4),
        min: Math.min(...dataArray).toFixed(4),
        max: Math.max(...dataArray).toFixed(4)
      }
    } catch (err) {
      console.error('Error calculating statistics:', err)
      return {}
    }
  }, [dataArray])

  // Update statistics when calculated stats change
  useEffect(() => {
    if (Object.keys(calculatedStats).length > 0) {
      setStatistics(calculatedStats)
    }
  }, [calculatedStats])

  const getSkewnessInterpretation = useCallback((skewness) => {
    const skew = parseFloat(skewness)
    if (Math.abs(skew) < 0.5) return 'Approximately symmetric'
    if (skew > 0.5) return 'Right-skewed (positive skew)'
    if (skew < -0.5) return 'Left-skewed (negative skew)'
    return 'Moderately skewed'
  }, [])

  const getSkewnessColour = useCallback((skewness) => {
    const skew = parseFloat(skewness)
    if (Math.abs(skew) < 0.5) return '#10b981' // green
    if (skew > 0.5) return '#f59e0b' // amber
    if (skew < -0.5) return '#ef4444' // red
    return '#6b7280' // gray
  }, [])

  // Memoized chart data generation
  const chartData = useMemo(() => {
    return dataArray.map((value, index) => ({
      index: index + 1,
      value: value
    }))
  }, [dataArray])

  const histogramData = useMemo(() => {
    if (dataArray.length === 0) return []
    
    const distributionData = dataArray.reduce((acc, value) => {
      const bin = Math.floor(value / 10) * 10 // Simple binning
      const binKey = `${bin}-${bin + 10}`
      acc[binKey] = (acc[binKey] || 0) + 1
      return acc
    }, {})

    return Object.entries(distributionData).map(([bin, count]) => ({
      bin: bin,
      count: count
    }))
  }, [dataArray])

  const gaussianData = useMemo(() => {
    if (dataArray.length === 0 || !statistics.mean || !statistics.stdDev) return []
    
    try {
      const mean = parseFloat(statistics.mean)
      const stdDev = parseFloat(statistics.stdDev)
      const min = Math.min(...dataArray)
      const max = Math.max(...dataArray)
      const range = max - min
      
      // Create points for the Gaussian curve (limited for performance)
      const points = []
      const step = range / 50 // Reduced from 100 to 50 for better performance
      
      for (let x = min - range * 0.1; x <= max + range * 0.1; x += step) {
        // Gaussian function: f(x) = (1/(σ√(2π))) * e^(-((x-μ)²)/(2σ²))
        const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2))
        const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent)
        
        // Scale the y value to fit nicely on the chart
        const scaledY = y * 1000 // Scale factor for better visualisation
        
        points.push({
          x: x,
          gaussian: scaledY,
          theoretical: scaledY
        })
      }
      
      return points
    } catch (err) {
      console.error('Error generating Gaussian curve:', err)
      return []
    }
  }, [dataArray, statistics.mean, statistics.stdDev])

  return (
    <div className="app">
      <header className="app-header">
        <h1>📊 Skewness Calculator</h1>
        <p>Calculate statistical measures including skewness for your dataset</p>
      </header>

      <main className="app-main">
        <section className="input-section">
          <h2>Data Input</h2>
          <div className="input-group">
            <label htmlFor="data-input">Enter your data (comma or space separated):</label>
            <textarea
              id="data-input"
              value={data}
              onChange={handleDataInput}
              placeholder="Example: 1, 2, 3, 4, 5 or 1 2 3 4 5"
              rows={4}
            />
            <button 
              className="calculate-btn"
              onClick={handleCalculate}
              disabled={isCalculating || !data.trim()}
            >
              {isCalculating ? '🔄 Calculating...' : '📊 Calculate Statistics'}
            </button>
            {error && <p className="error">{error}</p>}
            <p className="help-text">
              Enter numbers separated by commas or spaces, then click the Calculate button.
              {dataArray.length > 0 && <span className="data-count"> ({dataArray.length} numbers processed)</span>}
            </p>
          </div>
        </section>

        {dataArray.length > 0 && (
          <>
            <section className="statistics-section">
              <h2>Statistical Summary</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Sample Size</h3>
                  <p className="stat-value">{statistics.count}</p>
                </div>
                <div className="stat-card">
                  <h3>Mean</h3>
                  <p className="stat-value">{statistics.mean}</p>
                </div>
                <div className="stat-card">
                  <h3>Median</h3>
                  <p className="stat-value">{statistics.median}</p>
                </div>
                <div className="stat-card">
                  <h3>Standard Deviation</h3>
                  <p className="stat-value">{statistics.stdDev}</p>
                </div>
                <div className="stat-card">
                  <h3>Variance</h3>
                  <p className="stat-value">{statistics.variance}</p>
                </div>
                <div className="stat-card">
                  <h3>Q1 (25th percentile)</h3>
                  <p className="stat-value">{statistics.q1}</p>
                </div>
                <div className="stat-card">
                  <h3>Q3 (75th percentile)</h3>
                  <p className="stat-value">{statistics.q3}</p>
                </div>
                <div className="stat-card">
                  <h3>Range</h3>
                  <p className="stat-value">{statistics.min} - {statistics.max}</p>
                </div>
              </div>
            </section>

            <section className="skewness-section">
              <h2>Skewness Analysis</h2>
              <div className="skewness-display">
                <div className="skewness-value" style={{ color: getSkewnessColour(statistics.skewness) }}>
                  <h3>Skewness Coefficient</h3>
                  <p className="skewness-number">{statistics.skewness}</p>
                  <p className="skewness-interpretation">
                    {getSkewnessInterpretation(statistics.skewness)}
                  </p>
                </div>
                <div className="skewness-explanation">
                  <h4>What does this mean?</h4>
                  <ul>
                    <li><strong>Skewness = 0:</strong> Perfectly symmetric distribution</li>
                    <li><strong>Skewness &gt; 0:</strong> Right-skewed (longer right tail)</li>
                    <li><strong>Skewness &lt; 0:</strong> Left-skewed (longer left tail)</li>
                    <li><strong>|Skewness| &gt; 1:</strong> Highly skewed distribution</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="charts-section">
              <h2>Data Visualisations</h2>
              <div className="charts-grid">
                <div className="chart-container">
                  <h3>Data Points Over Time</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="index" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-container">
                  <h3>Data Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={histogramData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="bin" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-container gaussian-chart">
                  <h3>Gaussian (Normal) Distribution Comparison</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={gaussianData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="x" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'gaussian' ? 'Theoretical Normal' : 'Data Distribution',
                          value.toFixed(2)
                        ]}
                        labelFormatter={(label) => `Value: ${label.toFixed(2)}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="gaussian" 
                        stroke="#667eea" 
                        fill="#667eea" 
                        fillOpacity={0.3}
                        name="gaussian"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="gaussian-info">
                    <p><strong>Blue curve:</strong> Theoretical normal distribution based on your data's mean and standard deviation</p>
                    <p><strong>Comparison:</strong> How well your data fits a normal distribution</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>Built with React, Vite, Recharts, and Math.js</p>
      </footer>
    </div>
  )
}

export default App
