import React, { Component } from 'react';
import cx from 'classnames';
import PropTypes, { string } from 'prop-types';
import 'selectize';

export default class Text extends Component {
  static propTypes = {
    disabled: PropTypes.bool,
    values: PropTypes.arrayOf(PropTypes.string),
    onChange: PropTypes.func,
  };
  static defaultProps = {
    values: [],
  };
  constructor(props) {
    super(props);
    this.state = {};
  }
  componentDidMount() {
    const { onChange } = this.props;
    if (this.input) {
      this.selectize = $(this.input).selectize({
        plugins: ['remove_button'],
        placeholder: _l('请输入'),
        delimiter: ',',
        persist: false,
        openOnFocus: false,
        maxOptions: 0,
        create: (input) => {
          return {
            value: input,
            text: input,
          };
        },
        render: {
          option_create(data, escape) {
            return `<div class="create ThemeColor3">${_l('使用"%0"', data.input)}</div>`;
          },
        },
        onChange: (selectizevalue) => {
          onChange({ values: selectizevalue ? selectizevalue.split(',') : [] });
        },
      })[0].selectize;
    }
  }
  render() {
    let { values, disabled } = this.props;
    values = !values ? [] : values;
    return (<div className={cx('worksheetFilterTextCondition', { disabled })}>
      <input type="text" ref={input => (this.input = input)} value={values.join(',')} readOnly />
    </div>);
  }
}
