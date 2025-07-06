import React, { Component } from 'react';
import ChartWrapper from './ChartWrapper';

class BarChart extends Component {
  constructor(props) {
    super(props);
    this.state = {
      chartData: [],
      chartOptions: {},
      chartRef: null
    };
  }

  componentDidMount() {
    this.setState({
      chartData: this.props.chartData,
      chartOptions: this.props.chartOptions,
      chartRef: this.props.chartRef
    });
  }

  render() {
    return (
      <ChartWrapper
        chartRef={this.props.chartRef}
        options={this.state.chartOptions}
        series={this.state.chartData}
        type="bar"
        width="100%"
        height="100%"
      />
    );
  }
}

export default BarChart;
