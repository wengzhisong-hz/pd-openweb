import React, { Component } from 'react';
import { string, arrayOf, shape, func } from 'prop-types';
import { TagTextarea } from 'ming-ui';
import { SelectOtherField, OtherField } from '../components';
import { FIELD_REG_EXP, UNSAVED_FIELD_REGEXP, UUID_REGEXP } from '../config';
import { DynamicValueInputWrap } from '../styled';

export default class TextInput extends Component {
  static propTypes = {
    dynamicValue: arrayOf(shape({ cid: string, rcid: string, staticValue: string })),
    onDynamicValueChange: func,
    clearOldDefault: func,
  };
  static defaultProps = {
    onDynamicValueChange: _.noop,
    clearOldDefault: _.noop,
    dynamicValue: [],
  };
  componentDidMount() {
    const { dynamicValue, data, clearOldDefault } = this.props;
    const { default: defaultValue } = data;
    if (defaultValue) {
      this.setDynamicValue(dynamicValue.concat({ cid: '', rcid: '', staticValue: defaultValue }));
      clearOldDefault();
    } else {
      this.setDynamicValue(dynamicValue, false);
    }
  }
  componentWillReceiveProps(nextProps) {
    if (
      nextProps.data.controlId !== this.props.data.controlId ||
      JSON.stringify(this.props.dynamicValue) !== JSON.stringify(nextProps.dynamicValue)
    ) {
      const cursor = this.$tagtextarea.cmObj.getCursor();
      this.setDynamicValue(nextProps.dynamicValue, false);
      this.$tagtextarea.cmObj.setCursor(cursor);
    }
  }
  // 设置为标签格式
  setDynamicValue = (dynamicValue = [], needEmitChange = true) => {
    let fields = '';

    dynamicValue.forEach(item => {
      const { cid, rcid, staticValue } = item;
      if (cid) {
        fields += rcid ? `$${cid}~${rcid}$` : `$${cid}$`;
      } else {
        fields += staticValue;
      }
    });
    if (this.$tagtextarea) {
      this.$tagtextarea.setValue(fields);
    }
    if (needEmitChange) {
      this.props.onDynamicValueChange(dynamicValue);
    }
  };
  // 输入普通字符串时数据转换
  transferValue = value => {
    const savedControlFields = value.match(FIELD_REG_EXP) || [];
    const unsavedControlFields = value.match(UUID_REGEXP) || [];
    const controlFields = savedControlFields.concat(unsavedControlFields);
    const defaultValue = _.filter(value.split('$'), v => !_.isEmpty(v));
    const defsource = defaultValue.map(item => {
      const defaultData = { cid: '', rcid: '', staticValue: '' };
      if (_.includes(controlFields, `$${item}$`)) {
        const [cid = '', rcid = ''] = item.split('~');
        return { ...defaultData, cid, rcid };
      } else {
        return { ...defaultData, staticValue: item };
      }
    });
    this.props.onDynamicValueChange(defsource);
  };
  render() {
    return (
      <DynamicValueInputWrap>
        <TagTextarea
          className="tagTextAreaWrap"
          renderTag={(tag, options) => {
            const [cid = '', rcid = ''] = tag.split('~');
            return <OtherField className="tagTextField overflow_ellipsis" item={{ cid, rcid }} {...this.props} />;
          }}
          getRef={tagtextarea => (this.$tagtextarea = tagtextarea)}
          onChange={(err, value, obj) => {
            this.transferValue(value.trim());
          }}
        />
        <SelectOtherField {...this.props} onDynamicValueChange={this.setDynamicValue} />
      </DynamicValueInputWrap>
    );
  }
}
