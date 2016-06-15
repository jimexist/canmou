var pageSize = 100;
var names = {
  'payAmt': '支付金额',
  'payItemQty': '支付件数',
  'payBuyerCnt': '支付买家数',
  'payPct': '客单价',
  'payRate': '支付转化率'
};
var codes = _.keys(names);
var displayNames = _.values(names);
var fieldNames = _.concat(['id', 'name'], displayNames);

function getDateString(prompt, defaultValue) {
  var input = window.prompt(prompt, defaultValue);
  var dateInput = moment(input, 'YYYY-MM-DD');
  if (dateInput.isValid()) {
    return dateInput.format('YYYY-MM-DD');
  }
  throw new Error('输入日期格式不对');
}

function getQuery(page) {
  var yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
  var dateFrom = getDateString('开始时间（默认是最近一天，即昨天）', yesterday);
  var dateTo = getDateString('结束时间（默认是最近一天，即昨天）', yesterday);
  var params = {
    dateType: 'day',
    dateRange: _.join([dateFrom, dateTo], '|'),
    device: 0, // or 1 or 2
    page: page,
    contentType: 'simple',
    pageSize: pageSize,
    order: 'desc',
    orderBy: codes[0],
    indexCode: _.join(codes, ','),
  };
  return _(params)
    .toPairs()
    .map(function(tuple) {
      return _.join(tuple, '=');
    })
    .join('&');
}

function transformData(data) {
  return _.map(data, function(item) {
    var values = _.chain(item.indexMap)
      .toPairs()
      .map(function(tuple) {
        var key = names[tuple[0]];
        var value = tuple[1];
        return [key, value.value];
      })
      .fromPairs()
      .value();
    return _.merge({}, _.omit(item, 'indexMap'), values);
  });
}

function pagedQuery(page, url, name) {
  var requestUrl = '/ebda/overview/' + url + '.json?' + getQuery(page);
  console.time(requestUrl);
  $.get(requestUrl)
    .then(function(resp) {
      if (!resp.data) {
        alert('没有获取到数据，错误信息是：\n' + JSON.stringify(resp));
        return;
      }
      var json = transformData(resp.data.data);
      console.log('json', json);
      json2csv({
        fields: fieldNames,
        data: json,
      }, function(err, csv) {
        if (err) {
          console.error('error converting to csv', err);
          return;
        }
        var filename = _.join([name, page], '_') + '.csv';
        var file = new File([csv], filename, {
          type: 'text/csv;charset=utf-8'
        });
        saveAs(file);
        console.timeEnd(requestUrl);
        var count = resp.data.recordCount;
        if (page * pageSize < count) {
          pagedQuery(page + 1);
        }
      });
    }, function(err) {
      console.error('ajax error', err);
    });
}

function req() {
  pagedQuery(1, 'listLevel1', '一级类目');
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.message === "clicked_browser_action") {
    req();
  }
});
