// 地区
REGION = ''

// 储存桶的名字
BUCKET = ''

// access_key 和 secret_key
// 授权凭证
ACCESS_KEY = ''
SECRET_KEY = ''

// base64编码方法,兼容中文
function utoa (str) {
  return window.btoa(unescape(encodeURIComponent(str)))
}

// 上传时使用的函数
function upload () {
  // 首先获取用户选择的文件
  var $input = $('#inputFile')
  var file = $input[0].files[0]

  // 生成一个随机文件名
  var key = uuid() + file.name

  // 获取密钥
  var form = s3_upload_form(ACCESS_KEY, SECRET_KEY, REGION, BUCKET, key)

  // 新建一个formdata 对象
  var data = new FormData()

  // 为formdata 对象赋值
  data.append('acl', form['acl'])
  data.append('key', form['key'])
  data.append('policy', form['policy'])
  data.append('success_action_status', form['success_action_status'])
  data.append('x-amz-algorithm', form['x-amz-algorithm'])
  data.append('x-amz-credential', form['x-amz-credential'])
  data.append('x-amz-date', form['x-amz-date'])
  data.append('x-amz-signature', form['x-amz-signature'])
  data.append('file', file)

  // 通过ajax 向s3 直接post上传文件
  $.ajax({
    type: 'POST',
    url: form.action,
    data: data,
    cache: false,
    processData: false,
    contentType: false,
    success: function (res) {

      // 上传成功，获取存储的地址
      var url = $(res).find('Location').text()

      // 删除之前遗留的按钮
      $('#show').remove()
      $('#url').remove()

      // 添加查看的按钮，和有url值的输入框
      $('body').
        append('<input id="url" value="' + url +
          '" type="text" class="url form-control" >')
      $('body').
        append(
          '<button id="show" class="show btn btn-primary btn-block" onclick="show()">查看</button>')

    },
  })

}

// 将原本隐藏的输入框显示出来
function show () {
  $('#url').show()
}

// 生成一个随机的uuid
function uuid () {

  var s = []

  var hexDigits = '0123456789abcdef'

  for (var i = 0; i < 36; i++) {

    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1)

  }

  s[14] = '4'  // bits 12-15 of the time_hi_and_version field to 0010

  s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1)  // bits 6-7 of the clock_seq_hi_and_reserved to 01

  s[8] = s[13] = s[18] = s[23] = '-'

  var uuid = s.join('')

  return uuid

}

// 上传时需要用的密钥
function s3_upload_form (access_key, secret_key, region, bucket, key) {

  // post form
  var form = {
    'acl': 'public-read',
    'success_action_status': '201',
    'x-amz-algorithm': 'AWS4-HMAC-SHA256',
    'x-amz-credential': access_key + '/' + getDate() + '/' + region +
    '/s3/aws4_request',
    'x-amz-date': getDate() + 'T000000Z',
  }

  // post 策略
  // 参考 https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-HTTPPOSTConstructPolicy.html
  var policy = {
    'conditions': [
      {'bucket': bucket},
      {'acl': 'public-read'},
      ['content-length-range', 32, 10485760],
      {'success_action_status': form['success_action_status']},
      {'x-amz-algorithm': form['x-amz-algorithm']},
      {'x-amz-credential': form['x-amz-credential']},
      {'x-amz-date': form['x-amz-date']},
    ],
    'expiration': getExactDate(),
  }

  form['action'] = 'https://' + bucket + '.s3-' + region + '.amazonaws.com/'
  form['key'] = key

  policy['conditions'].push({'key': key})

  // policy 要base64编码
  form['policy'] = utoa(JSON.stringify(policy))

  // x-amz-signature 最重要的签名值
  form['x-amz-signature'] = sign(secret_key, region, 's3', form['policy'])
  return form
}

// 签名函数
function sign (key, region, service, msg) {
  var date = getDate()
  // CryptoJS 提供的HmacSHA256 方法
  // 参考 https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-authentication-HTTPPOST.html
  var kDate = CryptoJS.HmacSHA256(date, 'AWS4' + key)
  var kRegion = CryptoJS.HmacSHA256(region, kDate)
  var kService = CryptoJS.HmacSHA256(service, kRegion)
  var kSigning = CryptoJS.HmacSHA256('aws4_request', kService)
  return CryptoJS.HmacSHA256(msg, kSigning)
}

// 当前日期 返回20190908
function getDate () {
// 获取当前日期
  var date = new Date()

  var nowYear = date.getFullYear()

// 获取当前月份
  var nowMonth = date.getMonth() + 1

// 获取当前是几号
  var nowDate = date.getDate()

// 对月份进行处理，1-9月在前面添加一个“0”
  if (nowMonth >= 1 && nowMonth <= 9) {
    nowMonth = '0' + nowMonth
  }

// 对月份进行处理，1-9号在前面添加一个“0”
  if (nowDate >= 0 && nowDate <= 9) {
    nowDate = '0' + nowDate
  }
  // return '20190908'
  return nowYear + nowMonth + nowDate
}

// 当前时间,精确到秒
function getExactDate () {
  var date = new Date()
  date.setTime(date.getTime() + 30 * 60 * 1000)

  var nowYear = date.getFullYear()

// 获取当前月份
  var nowMonth = date.getMonth() + 1

// 获取当前是几号
  var nowDate = date.getDate()

  var hour = date.getHours()//得到小时
  var minu = date.getMinutes()//得到分钟
  var sec = date.getSeconds()//得到秒
  if (hour < 10) hour = '0' + hour
  if (minu < 10) minu = '0' + minu
  if (sec < 10) sec = '0' + sec

// 对月份进行处理，1-9月在前面添加一个“0”
  if (nowMonth >= 1 && nowMonth <= 9) {
    nowMonth = '0' + nowMonth
  }

// 对月份进行处理，1-9号在前面添加一个“0”
  if (nowDate >= 0 && nowDate <= 9) {
    nowDate = '0' + nowDate
  }
  // return '2019-09-08T12:26:18Z'
  return nowYear + '-' + nowMonth + '-' + nowDate + 'T' + hour + ':' + minu +
    ':' + sec + 'Z'

}