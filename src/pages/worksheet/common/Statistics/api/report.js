import base, { controllerName } from './base';
/**
 * report
*/
var report = {
  /**
   * 导出图表
   * @param {Object} args 请求参数
   * @param {string} [args.pageId] 页面id
   * @param {string} [args.reportId] 图表id
   * @param {Object} options 配置参数
   * @param {Boolean} options.silent 是否禁止错误弹层
   */
  export: function(args, options) {
    base.ajaxOptions.url = base.server() + '/report/exportReport';
    base.ajaxOptions.type = 'GET';
    return $.api(controllerName, 'reportexportReport', args, $.extend(base, options));
  },
  /**
   * 获取图表的数据（结果toString过的）
   * @param {Object} args 请求参数
   * @param {获取图表数据} {filterCode:范围 :空 代表全中国(string),filterControls:筛选条件(array),filterRangeId:筛选范围字段ID(string),particleSizeType:粒度 1:日 2:周 3:月  /  行政区域图 1： 全国，2：省，3：市(integer),rangeType:筛选范围: 1:今天，2：昨天，3：明天，4：本周，5：上周，6：下周，8：本月，9：上月，10：下月，11：本季度，12：上季度，13：下季度，15：本年，16：上一年，17：下一年，18：今天之前的...天，19：今天之后的..天,20:自定义(integer),rangeValue:范围的值：7:7天，14：14天，30：30天,90：90天，180：180天，365：365天(string),reportId:图表ID(string),sorts:自定义排序的数组(array),}*reportDataRequest
   * @param {Object} options 配置参数
   * @param {Boolean} options.silent 是否禁止错误弹层
   */
  getReportData: function(args, options) {
    base.ajaxOptions.url = base.server() + '/report/get';
    base.ajaxOptions.type = 'POST';
    return $.api(controllerName, 'reportget', JSON.stringify(args), $.extend(base, options));
  },
  /**
   * 获取图表的数据
   * @param {Object} args 请求参数
   * @param {获取图表数据} {filterCode:范围 :空 代表全中国(string),filterControls:筛选条件(array),filterRangeId:筛选范围字段ID(string),particleSizeType:粒度 1:日 2:周 3:月  /  行政区域图 1： 全国，2：省，3：市(integer),rangeType:筛选范围: 1:今天，2：昨天，3：明天，4：本周，5：上周，6：下周，8：本月，9：上月，10：下月，11：本季度，12：上季度，13：下季度，15：本年，16：上一年，17：下一年，18：今天之前的...天，19：今天之后的..天,20:自定义(integer),rangeValue:范围的值：7:7天，14：14天，30：30天,90：90天，180：180天，365：365天(string),reportId:图表ID(string),sorts:自定义排序的数组(array),}*reportDataRequest
   * @param {Object} options 配置参数
   * @param {Boolean} options.silent 是否禁止错误弹层
   */
  getData: function(args, options) {
    base.ajaxOptions.url = base.server() + '/report/getData';
    base.ajaxOptions.type = 'POST';
    return $.api(controllerName, 'reportgetData', JSON.stringify(args), $.extend(base, options));
  },
  /**
   * 获取图表列表
   * @param {Object} args 请求参数
   * @param {string} [args.appId] *工作表ID
   * @param {string} [args.appType] 默认1：工作表 
   * @param {string} [args.isOwner] 个人：true,公共：false
   * @param {string} [args.pageIndex] 页数
   * @param {string} [args.pageSize] 条数
   * @param {Object} options 配置参数
   * @param {Boolean} options.silent 是否禁止错误弹层
   */
  list: function(args, options) {
    base.ajaxOptions.url = base.server() + '/report/list';
    base.ajaxOptions.type = 'GET';
    return $.api(controllerName, 'reportlist', args, $.extend(base, options));
  },
};
module.exports = report;