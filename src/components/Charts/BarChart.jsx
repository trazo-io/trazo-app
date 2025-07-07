import React, { Component } from 'react';
import ChartWrapper from './ChartWrapper';

class BarChart extends Component {
  constructor(props) {
    super(props);
    this.state = {
      chartData: [],
      chartOptions: {}
    };
  }

  componentDidMount() {
    this.setState({
      chartData: this.props.chartData,
      chartOptions: this.props.chartOptions
    });
  }

  render() {
    return (
      <ChartWrapper
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
