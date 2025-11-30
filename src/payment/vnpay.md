Hướng dẫn tích hợp hệ thống PAY - Cổng thanh toán VNPAY
Giới thiệu


Timeline


Các bước merchant cần xử lý tích hợp code cài đặt
(1) Cài đặt code build URL thanh toán chuyển hướng.
(2) Cài đặt code vnp_ReturnUrl URL thông báo kết quả thanh toán.
(3) Cài đặt code IPN URL cập nhật kết quả thanh toán. Gửi lại VNPAY URL này khi thiết lập xong.
Mô hình kết nối


Bước 1: Khách hàng thực hiện mua hàng trên Website - ứng dụng TMĐT và tiến hành thanh toán trực tuyến cho đơn hàng.
Bước 2: Website - ứng dụng TMĐT thành lập yêu cầu thanh toán dưới dạng URL mang thông tin thanh toán và chuyển hướng khách hàng sang Cổng thanh toán VNPAY bằng URL đó.
Cổng thanh toán VNPAY xử lý yêu cầu thanh toán mà Website - ứng dụng TMĐT gửi sang. Khách hàng tiến hành nhập hoặc xử lý xác thực các thông tin được yêu cầu Thanh toán.
Bước 3,4: Khách hàng nhập thông tin để xác minh tài khoản Ngân hàng của khách hàng và xác thực giao dịch (Nhập thông tin tài khoản, thẻ hoặc quét mã VNPAY-QR).
Bước 5: Giao dịch thành công tại Ngân hàng, VNPAY tiến hành:
Chuyển hướng khách hàng về Website - ứng dụng TMĐT (vnp_ReturnUrl)
Thông báo cho Website - ứng dụng TMĐT kết quả thanh toán của khách hàng thông qua IPN URL. Merchant cập nhật kết quả thanh toán VNPAY gửi tại URL này.
Bước 6: Merchant hiển thị kết quả giao dịch tới khách hàng (vnp_ReturnUrl).
Sơ đồ tuần tự



Thông tin cấu hình
Các thông tin cần thiết kết nối vào môi trường Sandbox Cổng thanh toán VNPAY:
- Mã TmnCode vnp_TmnCode là mã định danh kết nối được khai báo tại hệ thống của VNPAY. Mã định danh tương ứng với tên miền website, ứng dụng, dịch vụ của merchant kết nối vào VNPAY. Mỗi đơn vị có thể có một hoặc nhiều mã TmnCode kết nối.
- URL thanh toán (Sandbox): https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
- Secret Key vnp_HashSecret Chuỗi bí mật sử dụng để kiểm tra toàn vẹn dữ liệu khi hai hệ thống trao đổi thông tin (checksum).
- URL truy vấn kết quả giao dịch - hoàn tiền (Sandbox): https://sandbox.vnpayment.vn/merchant_webapi/api/transaction

Nếu chưa có thông tin cấu hình tích hợp, bạn có thể đăng ký ngay tại đây http://sandbox.vnpayment.vn/devreg/ Hệ thống sẽ gửi thông tin kết nối về email bạn đăng ký

Tạo URL Thanh toán
URL thanh toán (Sandbox): https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

Phương thức: GET

URL Thanh toán là địa chỉ URL mang thông tin thanh toán.
Website TMĐT gửi sang Cổng thanh toán VNPAY các thông tin này khi xử lý giao dịch thanh toán trực tuyến cho Khách mua hàng.
URL có dạng:

Copy
https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=1806000&vnp_Command=pay&vnp_CreateDate=20210801153333&vnp_CurrCode=VND&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+don+hang+%3A5&vnp_OrderType=other&vnp_ReturnUrl=https%3A%2F%2Fdomainmerchant.vn%2FReturnUrl&vnp_TmnCode=DEMOV210&vnp_TxnRef=5&vnp_Version=2.1.0&vnp_SecureHash=3e0d61a0c0534b2e36680b3f7277743e8784cc4e1d68fa7d276e79c23be7d6318d338b477910a27992f5057bb1582bd44bd82ae8009ffaf6d141219218625c42
Danh sách tham số - Thông tin gửi sang VNPAY (vnp_Command=pay)
Tham số	Kiểu dữ liệu	Bắt buộc/Tùy chọn	Mô tả
vnp_Version	Alphanumeric[1,8]	Bắt buộc	Phiên bản api mà merchant kết nối. Phiên bản hiện tại là : 2.1.0
vnp_Command	Alpha[1,16]	Bắt buộc	Mã API sử dụng, mã cho giao dịch thanh toán là: pay
vnp_TmnCode	Alphanumeric[8]	Bắt buộc	Mã website của merchant trên hệ thống của VNPAY. Ví dụ: 2QXUI4J4
vnp_Amount	Numeric[1,12]	Bắt buộc	Số tiền thanh toán. Số tiền không mang các ký tự phân tách thập phân, phần nghìn, ký tự tiền tệ. Để gửi số tiền thanh toán là 10,000 VND (mười nghìn VNĐ) thì merchant cần nhân thêm 100 lần (khử phần thập phân), sau đó gửi sang VNPAY là: 1000000
vnp_BankCode	Alphanumeric[3,20]	Tùy chọn	Mã phương thức thanh toán, mã loại ngân hàng hoặc ví điện tử thanh toán.
Nếu không gửi sang tham số này, chuyển hướng người dùng sang VNPAY chọn phương thức thanh toán.
Lưu ý:
Các mã loại hình thức thanh toán lựa chọn tại website-ứng dụng của merchant
vnp_BankCode=VNPAYQRThanh toán quét mã QR
vnp_BankCode=VNBANKThẻ ATM - Tài khoản ngân hàng nội địa
vnp_BankCode=INTCARDThẻ thanh toán quốc tế
vnp_CreateDate	Numeric[14]	Bắt buộc	Là thời gian phát sinh giao dịch định dạng yyyyMMddHHmmss (Time zone GMT+7) Ví dụ: 20220101103111
vnp_CurrCode	Alpha[3]	Bắt buộc	Đơn vị tiền tệ sử dụng thanh toán. Hiện tại chỉ hỗ trợ VND
vnp_IpAddr	Alphanumeric[7,45]	Bắt buộc	Địa chỉ IP của khách hàng thực hiện giao dịch. Ví dụ: 13.160.92.202
vnp_Locale	Alpha[2,5]	Bắt buộc	Ngôn ngữ giao diện hiển thị. Hiện tại hỗ trợ Tiếng Việt (vn), Tiếng Anh (en)
vnp_OrderInfo	Alphanumeric[1,255]	Bắt buộc	Thông tin mô tả nội dung thanh toán quy định dữ liệu gửi sang VNPAY (Tiếng Việt không dấu và không bao gồm các ký tự đặc biệt)
Ví dụ: Nap tien cho thue bao 0123456789. So tien 100,000 VND
vnp_OrderType	Alpha[1,100]	Bắt buộc	Mã danh mục hàng hóa. Mỗi hàng hóa sẽ thuộc một nhóm danh mục do VNPAY quy định. Xem thêm bảng Danh mục hàng hóa
vnp_ReturnUrl	Alphanumeric[10,255]	Bắt buộc	URL thông báo kết quả giao dịch khi Khách hàng kết thúc thanh toán. Ví dụ: https://domain.vn/VnPayReturn
vnp_ExpireDate	Numeric[14]	Bắt buộc	Thời gian hết hạn thanh toán GMT+7, định dạng: yyyyMMddHHmmss
vnp_TxnRef	Alphanumeric[1,100]	Bắt buộc	Mã tham chiếu của giao dịch tại hệ thống của merchant. Mã này là duy nhất dùng để phân biệt các đơn hàng gửi sang VNPAY. Không được trùng lặp trong ngày. Ví dụ: 23554
vnp_SecureHash	Alphanumeric[32,256]	Bắt buộc	Mã kiểm tra (checksum) để đảm bảo dữ liệu của giao dịch không bị thay đổi trong quá trình chuyển từ merchant sang VNPAY. Việc tạo ra mã này phụ thuộc vào cấu hình của merchant và phiên bản api sử dụng. Phiên bản hiện tại hỗ trợ SHA256, HMACSHA512.
Lưu ý
Dữ liệu checksum được thành lập dựa trên việc sắp xếp tăng dần của tên tham số (QueryString)
Số tiền cần thanh toán nhân với 100 để triệt tiêu phần thập phân trước khi gửi sang VNPAY
vnp_BankCode: Giá trị này tùy chọn.
- Nếu loại bỏ tham số không gửi sang, khách hàng sẽ chọn phương thức thanh toán, ngân hàng thanh toán tại VNPAY.
- Nếu thiết lập giá trị (chọn Ngân hàng thanh toán tại Website-ứng dụng TMĐT), Tham khảo bảng mã trả về tại API:
Endpoint: https://sandbox.vnpayment.vn/qrpayauth/api/merchant/get_bank_list
Http method: POST
Content-Type: application/x-www-form-urlencoded
key tmn_code
value Theo mã định danh kết nối (vnp_TmnCode) VNPAY cung cấp
Trong URL thanh toán có tham số vnp_ReturnUrl là URL thông báo kết quả giao dịch khi Khách hàng kết thúc thanh toán
Code cài đặt
PHP
C#
Python
Java
NodeJS
Copy

    router.post('/create_payment_url', function (req, res, next) {
        var ipAddr = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;
    
        var config = require('config');
        var dateFormat = require('dateformat');
    
        
        var tmnCode = config.get('vnp_TmnCode');
        var secretKey = config.get('vnp_HashSecret');
        var vnpUrl = config.get('vnp_Url');
        var returnUrl = config.get('vnp_ReturnUrl');
    
        var date = new Date();
    
        var createDate = dateFormat(date, 'yyyymmddHHmmss');
        var orderId = dateFormat(date, 'HHmmss');
        var amount = req.body.amount;
        var bankCode = req.body.bankCode;
        
        var orderInfo = req.body.orderDescription;
        var orderType = req.body.orderType;
        var locale = req.body.language;
        if(locale === null || locale === ''){
            locale = 'vn';
        }
        var currCode = 'VND';
        var vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        // vnp_Params['vnp_Merchant'] = ''
        vnp_Params['vnp_Locale'] = locale;
        vnp_Params['vnp_CurrCode'] = currCode;
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = orderInfo;
        vnp_Params['vnp_OrderType'] = orderType;
        vnp_Params['vnp_Amount'] = amount * 100;
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;
        if(bankCode !== null && bankCode !== ''){
            vnp_Params['vnp_BankCode'] = bankCode;
        }
    
        vnp_Params = sortObject(vnp_Params);
    
        var querystring = require('qs');
        var signData = querystring.stringify(vnp_Params, { encode: false });
        var crypto = require("crypto");     
        var hmac = crypto.createHmac("sha512", secretKey);
        var signed = hmac.update(new Buffer(signData, 'utf-8')).digest("hex"); 
        vnp_Params['vnp_SecureHash'] = signed;
        vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });
    
        res.redirect(vnpUrl)
    });
    // Vui lòng tham khảo thêm tại code demo
    
Cài đặt Code IPN URL
- Phương thức: GET

- Yêu cầu:

IPN URL cần có SSL
Nhận kết quả phản hồi từ Cổng thanh toán VNPAY, kiểm tra dữ liệu, cập nhật kết quả và phản hồi lại mã lỗi và mô tả mã lỗi (RspCode và Message) cho server VNPAY nhận biết
Đây là địa chỉ để hệ thống merchant nhận kết quả thanh toán trả về từ VNPAY. Trên URL VNPAY gọi về có mang thông tin thanh toán để căn cứ vào kết quả đó Website TMĐT xử lý các bước tiếp theo (ví dụ: cập nhật kết quả thanh toán vào Database …)
VNPAY trả về kết quả thanh toán URL có dạng:
Copy
https://{domain}/IPN?vnp_Amount=1000000&vnp_BankCode=NCB&vnp_BankTranNo=VNP14226112&vnp_CardType=ATM&vnp_OrderInfo=Thanh+toan+don+hang+thoi+gian%3A+2023-12-07+17%3A00%3A44&vnp_PayDate=20231207170112&vnp_ResponseCode=00&vnp_TmnCode=CTTVNP01&vnp_TransactionNo=14226112&vnp_TransactionStatus=00&vnp_TxnRef=166117&vnp_SecureHash=b6dababca5e07a2d8e32fdd3cf05c29cb426c721ae18e9589f7ad0e2db4b657c6e0e5cc8e271cf745162bcb100fdf2f64520554a6f5275bc4c5b5b3e57dc4b4b
Danh sách tham số - Thông tin nhận về từ VNPAY (vnp_Command=pay)
Tham số	Kiểu dữ liệu	Bắt buộc/Tùy chọn	Mô tả
vnp_TmnCode	Alphanumeric[8]	Bắt buộc	Mã website của merchant trên hệ thống của VNPAY. Ví dụ: 2QXUI4J4
vnp_Amount	Numeric[1,12]	Bắt buộc	Số tiền thanh toán. VNPAY phản hồi số tiền nhân thêm 100 lần.
vnp_BankCode	Alphanumeric[3,20]	Bắt buộc	Mã Ngân hàng thanh toán. Ví dụ: NCB
vnp_BankTranNo	Alphanumeric[1,255]	Tùy chọn	Mã giao dịch tại Ngân hàng. Ví dụ: NCB20170829152730
vnp_CardType	Alpha[2,20]	Tùy chọn	Loại tài khoản/thẻ khách hàng sử dụng:ATM,QRCODE
vnp_PayDate	Numeric[14]	Tùy chọn	Thời gian thanh toán. Định dạng: yyyyMMddHHmmss
vnp_OrderInfo	Alphanumeric[1,255]	Bắt buộc	Thông tin mô tả nội dung thanh toán (Tiếng Việt, không dấu). Ví dụ: **Nap tien cho thue bao 0123456789. So tien 100,000 VND**
vnp_TransactionNo	Numeric[1,15]	Bắt buộc	Mã giao dịch ghi nhận tại hệ thống VNPAY. Ví dụ: 20170829153052
vnp_ResponseCode	Numeric[2]	Bắt buộc	Mã phản hồi kết quả thanh toán. Quy định mã trả lời 00 ứng với kết quả Thành công cho tất cả các API. Tham khảo thêm tại bảng mã lỗi
vnp_TransactionStatus	Numeric[2]	Bắt buộc	Mã phản hồi kết quả thanh toán. Tình trạng của giao dịch tại Cổng thanh toán VNPAY.
-00: Giao dịch thanh toán được thực hiện thành công tại VNPAY
-Khác 00: Giao dịch không thành công tại VNPAY Tham khảo thêm tại bảng mã lỗi
vnp_TxnRef	Alphanumeric[1,100]	Bắt buộc	Giống mã gửi sang VNPAY khi gửi yêu cầu thanh toán. Ví dụ: 23554
vnp_SecureHash	Alphanumeric[32,256]	Bắt buộc	Mã kiểm tra (checksum) để đảm bảo dữ liệu của giao dịch không bị thay đổi trong quá trình chuyển từ VNPAY về Website TMĐT.
Cần kiểm tra đúng checksum khi bắt đầu xử lý yêu cầu (trước khi thực hiện các yêu cầu khác)
Lưu ý
Merchant/website TMĐT thực hiện kiểm tra sự toàn vẹn của dữ liệu (checksum) trước khi thực hiện các thao tác khác
Thao tác cập nhật/xử lý kết quả sau khi thanh toán được thực hiện tại URL này
Đây là URL server - call - server (Máy chủ VNPAY gọi máy chủ Merchant/website TMĐT)
Merchant trả dữ liệu lại cho VNPAY bằng mã RspCode và Message định dạng JSON:
Trong đó:
RspCode là mã lỗi tình trạng cập nhật trạng thái thanh toán của giao dịch tại đầu IPN của merchant.
Message là mô tả mã lỗi của RspCode
Merchant cần tuân thủ theo các trường hợp kiểm và phản hồi lại RspCode cho VNPAY. Vui lòng tham khảo thêm tại code demo IPN của VNPAY
Cơ chế retry IPN:
Hệ thống VNPAY căn cứ theo RspCode phản hồi từ merchant để kết thúc luồng hay bật cơ chế retry
RspCode: 00, 02 là mã lỗi IPN của merchant phản hồi đã cập nhật được tình trạng giao dịch. VNPAY kết thúc luồng
RspCode: 01, 04, 97, 99 hoặc IPN timeout là mã lỗi IPN merchant không cập nhật được tình trạng giao dịch. VNPAY bật cơ chế retry IPN
Tổng số lần gọi tối đa: 10 lần
Khoảng cách giữa các lần gọi lại: 5 phút
Code cài đặt
PHP
C#
Python
Java
NodeJS
Copy

    router.get('/vnpay_ipn', function (req, res, next) {
        var vnp_Params = req.query;
        var secureHash = vnp_Params['vnp_SecureHash'];
    
        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];
    
        vnp_Params = sortObject(vnp_Params);
        var config = require('config');
        var secretKey = config.get('vnp_HashSecret');
        var querystring = require('qs');
        var signData = querystring.stringify(vnp_Params, { encode: false });
        var crypto = require("crypto");     
        var hmac = crypto.createHmac("sha512", secretKey);
        var signed = hmac.update(new Buffer(signData, 'utf-8')).digest("hex");     
         
    
        if(secureHash === signed){
            var orderId = vnp_Params['vnp_TxnRef'];
            var rspCode = vnp_Params['vnp_ResponseCode'];
            //Kiem tra du lieu co hop le khong, cap nhat trang thai don hang va gui ket qua cho VNPAY theo dinh dang duoi
            res.status(200).json({RspCode: '00', Message: 'success'})
        }
        else {
            res.status(200).json({RspCode: '97', Message: 'Fail checksum'})
        }
    });
    
Cài đặt Code Return URL
Dữ liệu VNPAY trả về bằng cách chuyển hướng trình duyệt web của khách hàng theo địa chỉ web mà Merchant cung cấp khi gửi yêu cầu thanh toán. Trên URL này mang thông tin kết quả thanh toán của khách hàng.


VNPAY trả về kết quả thanh toán URL có dạng:
Copy
https://{domain}/ReturnUrl?vnp_Amount=1000000&vnp_BankCode=NCB&vnp_BankTranNo=VNP14226112&vnp_CardType=ATM&vnp_OrderInfo=Thanh+toan+don+hang+thoi+gian%3A+2023-12-07+17%3A00%3A44&vnp_PayDate=20231207170112&vnp_ResponseCode=00&vnp_TmnCode=CTTVNP01&vnp_TransactionNo=14226112&vnp_TransactionStatus=00&vnp_TxnRef=166117&vnp_SecureHash=b6dababca5e07a2d8e32fdd3cf05c29cb426c721ae18e9589f7ad0e2db4b657c6e0e5cc8e271cf745162bcb100fdf2f64520554a6f5275bc4c5b5b3e57dc4b4b

Trong đó https://{domain}/ReturnUrllà URL nhận kết quả hệ thống gửi sang VNPAY theo URL thanh toán qua tham sốvnp_ReturnUrl
Danh sách tham số
Giống với tham số gửi về địa chỉ IPN URL

Lưu ý
URL này chỉ kiểm tra toàn vẹn dữ liệu (checksum) và hiển thị thông báo tới khách hàng
Không cập nhật kết quả giao dịch tại địa chỉ này
Code cài đặt
PHP
C#
Python
Java
NodeJS
Copy
 
    router.get('/vnpay_return', function (req, res, next) {
        var vnp_Params = req.query;
    
        var secureHash = vnp_Params['vnp_SecureHash'];
    
        delete vnp_Params['vnp_SecureHash'];
        delete vnp_Params['vnp_SecureHashType'];
    
        vnp_Params = sortObject(vnp_Params);
    
        var config = require('config');
        var tmnCode = config.get('vnp_TmnCode');
        var secretKey = config.get('vnp_HashSecret');
    
        var querystring = require('qs');
        var signData = querystring.stringify(vnp_Params, { encode: false });
        var crypto = require("crypto");     
        var hmac = crypto.createHmac("sha512", secretKey);
        var signed = hmac.update(new Buffer(signData, 'utf-8')).digest("hex");     
    
        if(secureHash === signed){
            //Kiem tra xem du lieu trong db co hop le hay khong va thong bao ket qua
    
            res.render('success', {code: vnp_Params['vnp_ResponseCode']})
        } else{
            res.render('success', {code: '97'})
        }
    });
    
Bảng mã lỗi của hệ thống thanh toán PAY
Mã lỗi	Mô tả
Bảng mã lỗi vnp_TransactionStatus
00	Giao dịch thành công
01	Giao dịch chưa hoàn tất
02	Giao dịch bị lỗi
04	Giao dịch đảo (Khách hàng đã bị trừ tiền tại Ngân hàng nhưng GD chưa thành công ở VNPAY)
05	VNPAY đang xử lý giao dịch này (GD hoàn tiền)
06	VNPAY đã gửi yêu cầu hoàn tiền sang Ngân hàng (GD hoàn tiền)
07	Giao dịch bị nghi ngờ gian lận
09	GD Hoàn trả bị từ chối
Mã lỗi	Mô tả
vnp_ResponseCode VNPAY phản hồi qua IPN và Return URL:
00	Giao dịch thành công
07	Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).
09	Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking tại ngân hàng.
10	Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần
11	Giao dịch không thành công do: Đã hết hạn chờ thanh toán. Xin quý khách vui lòng thực hiện lại giao dịch.
12	Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa.
13	Giao dịch không thành công do Quý khách nhập sai mật khẩu xác thực giao dịch (OTP). Xin quý khách vui lòng thực hiện lại giao dịch.
24	Giao dịch không thành công do: Khách hàng hủy giao dịch
51	Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch.
65	Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày.
75	Ngân hàng thanh toán đang bảo trì.
79	Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định. Xin quý khách vui lòng thực hiện lại giao dịch
99	Các lỗi khác (lỗi còn lại, không có trong danh sách mã lỗi đã liệt kê)