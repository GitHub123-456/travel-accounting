class ResponseUtil {
  static success(res, data = null, message = 'success', code = 200) {
    return res.status(200).json({
      code,
      message,
      data
    });
  }

  static error(res, message = '请求失败', code = 400, data = null) {
    return res.status(code >= 500 ? 500 : 200).json({
      code,
      message,
      data
    });
  }
}

module.exports = ResponseUtil;
