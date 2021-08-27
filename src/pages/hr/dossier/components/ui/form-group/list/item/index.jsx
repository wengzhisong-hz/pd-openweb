import PropTypes from 'prop-types';
import React, { Component } from 'react';

import './style.less';

class Item extends Component {
  render() {
    const classList = ['dossier-user-form-item'];
    if (this.props.size === 2) {
      classList.push('dossier-user-form-item-width-2');
    }
    const classNames = classList.join(' ');

    if (this.props.mark) {
      return (
        <li className={classNames}>
          <span className="dossier-user-form-item-value dossier-user-form-item-value-mark">{this.props.value}</span>
        </li>
      );
    } else {
      return (
        <li className={classNames}>
          <span className="dossier-user-form-item-label" title={this.props.label}>
            {_l(this.props.label)}
          </span>
          <span className="dossier-user-form-item-value">{this.props.value}</span>
        </li>
      );
    }
  }
}

Item.propTypes = {
  /**
   * 字段名称
   */
  label: PropTypes.string,
  /**
   * 字段值
   */
  value: PropTypes.string,
  /**
   * 显示大小
   * 1: 整行
   * 2: 半行
   */
  size: PropTypes.number,
  /**
   * 特殊标记
   */
  mark: PropTypes.bool,
};

Item.defaultProps = {
  label: '',
  value: '',
  size: 1,
  mark: false,
};

export default Item;
