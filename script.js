const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");
// API Setup
const API_KEY = "AIzaSyD6zAKxoZl-6mCJuIVqA-XSoWSVILgSG7A"; // Đảm bảo API_KEY của bạn là chính xác
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
let controller, typingInterval;
const chatHistory = [];
const userData = { message: "", file: {} };


// Dữ liệu môn học sẽ được tải từ file "data.txt"
let courseData = [];
let cnttMajorContentReply = "";
let registrationGuideReply = ""; // Biến mới cho hướng dẫn đăng ký
// Hàm để tải và phân tích cú pháp dữ liệu từ data.txt
async function loadDataFromTextFile() {
    try {
        const response = await fetch('data.txt');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const textContent = await response.text();

        // Trích xuất courseData
        const courseDataStart = textContent.indexOf('<COURSE_DATA_START>');
        const courseDataEnd = textContent.indexOf('<COURSE_DATA_END>');
        if (courseDataStart !== -1 && courseDataEnd !== -1) {
            const courseDataString = textContent.substring(courseDataStart + '<COURSE_DATA_START>'.length, courseDataEnd).trim();
            courseData = JSON.parse(courseDataString);
        } else {
            console.warn("Could not find <COURSE_DATA_START> or <COURSE_DATA_END> in data.txt for courseData.");
        }

        // Trích xuất cnttMajorContentReply
        const majorContentStart = textContent.indexOf('<MAJOR_CONTENT_START>');
        const majorContentEnd = textContent.indexOf('<MAJOR_CONTENT_END>');
        if (majorContentStart !== -1 && majorContentEnd !== -1) {
            cnttMajorContentReply = textContent.substring(majorContentStart + '<MAJOR_CONTENT_START>'.length, majorContentEnd).trim();
        } else {
            console.warn("Could not find <MAJOR_CONTENT_START> or <MAJOR_CONTENT_END> in data.txt for cnttMajorContentReply.");
        }

        // NEW: Trích xuất registrationGuideReply
        const registrationGuideStart = textContent.indexOf('<REGISTRATION_GUIDE_START>');
        const registrationGuideEnd = textContent.indexOf('<REGISTRATION_GUIDE_END>');
        if (registrationGuideStart !== -1 && registrationGuideEnd !== -1) {
            registrationGuideReply = textContent.substring(registrationGuideStart + '<REGISTRATION_GUIDE_START>'.length, registrationGuideEnd).trim();
        } else {
            console.warn("Không tìm thấy thẻ <REGISTRATION_GUIDE_START> hoặc <REGISTRATION_GUIDE_END> trong data.txt");
        }

    } catch (error) {
        console.error("Error loading or parsing data.txt:", error);
    }
}

// Gọi hàm để tải dữ liệu khi script được tải
loadDataFromTextFile();


// Set initial theme from local storage
const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

// Function to create message elements
const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content; // Sử dụng innerHTML để hiển thị link
    return div;
};

// Scroll to the bottom of the container
const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

// Simulate typing effect for bot responses
const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.textContent = "";
    const words = text.split(" ");
    let wordIndex = 0;
    // Set an interval to type each word
    typingInterval = setInterval(() => {
        if (wordIndex < words.length) {
            textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
            scrollToBottom();
        } else {
            clearInterval(typingInterval);
            botMsgDiv.classList.remove("loading");
            document.body.classList.remove("bot-responding");
        }
    }, 40); // 40 ms delay
};

// Function to get a response from local data or Gemini API
const getLocalResponse = (userInput) => {
    userInput = userInput.toLowerCase();

    // 1. Xử lý các câu hỏi cố định và chào hỏi
    const fixedResponses = [
    { keywords: ["ngành học", "chuyên ngành"], reply: "Ngành CNTT của trường ĐHTN trang bị kiến thức đa dạng về công nghệ thông tin. Bạn muốn tìm hiểu về các môn chuyên của trường không?" },
    { keywords: ["muốn","vâng", "đúng vậy", "muốn tìm hiểu"], reply: cnttMajorContentReply },
    { keywords: ["tư vấn", "tư vấn học tập", "khó khăn"], reply: "Bạn đang gặp khó khăn với môn nào? Hoặc bạn muốn biết thông tin về môn học nào cụ thể? Hãy cho tôi biết nhé!" },
    { keywords: ["tạm biệt", "bye", "hẹn gặp"], reply: "Tạm biệt! Chúc bạn học tốt và thành công!" },
    // ADD THIS LINE for "good job"
    { keywords: ["good job", "cảm ơn", "tuyệt vời", "tốt lắm"], reply: "Cảm ơn bạn! Rất vui được hỗ trợ sinh viên CNTT trường ĐHTN!" },
    { keywords: ["hoàn thành"], reply: "Theo nhà trường cần 4 năm để hoàn thành chương trình . Nếu nhanh sẽ là 3 năm rưỡi" },
    {
        "keywords": ["cần bao nhiêu tín chỉ để tốt nghiệp ngành cntt", "số tín chỉ tốt nghiệp cntt", "tín chỉ tốt nghiệp cntt", "cntt bao nhiêu tín chỉ để tốt nghiệp"],
        "reply": "Cần 128 tín chỉ để tốt nghiệp ngành CNTT trường ta."
    },//
    {
            keywords: ["đăng ký môn học online", "đăng ký học phần online", "cách đăng ký môn học", "đăng ký học online"],
            reply: registrationGuideReply
    },
    {
        keywords: ["thời gian đăng ký học phần", "học kỳ tới đăng ký khi nào", "bao giờ đăng ký môn học"],
        reply: "Thời gian đăng ký học phần cho học kỳ tới:\n* Đăng ký sớm: Thực hiện trước thời điểm bắt đầu học kỳ 1 tháng.\n* Đăng ký bình thường: Thực hiện trước thời điểm bắt đầu học kỳ 2 tuần.\n* Đăng ký muộn: Thực hiện trong 2 tuần đầu của học kỳ chính hoặc trong tuần đầu của học kỳ phụ, dành cho sinh viên muốn đăng ký học thêm hoặc đổi sang học phần khác khi không có lớp."
    },
    {
        keywords: ["làm sao biết đăng ký thành công", "đăng ký môn học thành công", "kiểm tra đăng ký môn học","đăng ký học phần thành công"],
        reply: "Để biết bạn đã đăng ký môn học thành công hay chưa, bạn có thể:\n1.  Kiểm tra trong hệ thống đăng ký tín chỉ của trường sau khi hoàn tất các bước đăng ký. Thường sẽ có mục 'Thời khóa biểu' hoặc 'Các học phần đã đăng ký'.\n2.  Hệ thống thường sẽ gửi email hoặc thông báo xác nhận nếu quá trình đăng ký thành công. Đảm bảo kiểm tra email sinh viên của bạn."
    },//
    {
        keywords: ["cách tính điểm trung bình", "tính điểm học kỳ", "tính điểm tích lũy", "công thức tính điểm"],
        reply: "Dựa vào Sổ tay sinh viên 2023 (trang 13 và 14, mục \"Quy định về đánh giá kết quả học tập\"), cách tính điểm như sau:\n\n**Điểm đánh giá bộ phận (Điểm thành phần):**\n- Điểm chuyên cần, thái độ học tập (A): Tối đa 10%.\n- Điểm kiểm tra giữa kỳ (B): Tối đa 30%.\n- Điểm bài tập, tiểu luận, thuyết trình (C): Tối đa 20%.\n- Điểm thi kết thúc học phần (D): Tối thiểu 40%.\n- **Điểm học phần (P)** = A x 0.1 + B x 0.3 + C x 0.2 + D x 0.4 (tùy phân bổ).\n\n**Chuyển đổi điểm số:** Thang điểm 10 quy đổi sang điểm chữ (A+, A, B+,...) và thang điểm 4 (A+/A: 4.0, B+: 3.5, B: 3.0, v.v.).\n\n**Điểm trung bình chung học kỳ (ĐTBCHT):**\n- Là điểm trung bình các học phần đăng ký học trong học kỳ.\n- **Công thức:** $ĐTBCHT = \\frac{\\sum (Đi \\times Si)}{\\sum Si}$ (Đi: Điểm học phần thang 4, Si: Số tín chỉ).\n\n**Điểm trung bình chung tích lũy (ĐTBCTL):**\n- Là điểm trung bình của tất cả các học phần đã tích lũy từ đầu khóa học.\n- **Công thức:** $ĐTBCTL = \\frac{\\sum (Đi \\times Si)}{\\sum Si}$ (bao gồm cả học phần học lại, cải thiện đã đạt)."
    },
    {
        keywords: ["quy định điểm danh", "điểm chuyên cần", "quy định vắng mặt", "điểm chuyên cần môn học","điểm danh"],
        reply: "Theo Sổ tay sinh viên 2023 (trang 13, mục \"Quy định về đánh giá kết quả học tập\"):\n\n- **Điểm chuyên cần, thái độ học tập (A)** là một thành phần điểm, chiếm **tối đa 10%** tổng số điểm học phần.\n- Sinh viên vắng mặt trên **30% tổng số tiết lý thuyết hoặc 20% tổng số tiết thực hành** của một học phần sẽ không được dự thi kết thúc học phần và bị điểm F học phần đó."
    },
    {
        keywords: ["chính sách thi lại", "học cải thiện", "quy định thi lại", "thi lại", "cải thiện điểm"],
        reply: "Dựa vào Sổ tay sinh viên 2023 (trang 15):\n\n**Thi lại:**\n- Sinh viên không đạt điểm D/F (dưới 4.0/10) hoặc có điểm F do bỏ thi/vắng mặt quá số buổi được phép đăng ký thi lại hoặc học lại.\n- Điểm thi lại sẽ thay thế điểm thi kết thúc học phần lần đầu để tính điểm học phần.\n\n**Học cải thiện:**\n- Sinh viên có điểm học phần đạt từ D+ trở lên (thang điểm 10) có thể đăng ký học lại để cải thiện điểm.\n- Điểm học phần cao nhất trong các lần học sẽ được tính vào điểm trung bình chung tích lũy."
    },
    {
        keywords: ["điều kiện xét học bổng", "học bổng khuyến khích học tập", "xét học bổng","học bổng"],
        reply: "Sổ tay sinh viên 2023 (trang 17, mục \"Quy định về học bổng khuyến khích học tập\") nêu rõ điều kiện:\n\n- **Không bị kỷ luật** từ mức khiển trách trở lên trong học kỳ.\n- **Không có học phần nào bị điểm F** trong học kỳ.\n- **Đạt điểm rèn luyện từ loại khá** trở lên (từ 70 điểm).\n- **Số tín chỉ đăng ký học trong học kỳ** phải bằng hoặc lớn hơn 15 tín chỉ (trừ các trường hợp đặc biệt).\n- **Điểm trung bình chung học tập của học kỳ** phải đạt từ 2.50 trở lên (thang điểm 4.0).\n- **Xếp loại học lực** từ khá trở lên:\n    - **Giỏi:** ĐTBCHT từ 3.20 - 3.59 (thang 4) và không có điểm học phần nào dưới 2.0.\n    - **Xuất sắc:** ĐTBCHT từ 3.60 - 4.00 (thang 4)."
    },//

    ///
    {
        keywords: ["quy chế đào tạo tín chỉ", "quy chế tín chỉ", "quy định đào tạo tín chỉ"],
        reply: "Trường áp dụng Quy chế đào tạo đại học theo hệ thống tín chỉ (Quyết định số 1676/QĐ-ĐHTN-ĐTĐH ngày 19/8/2019).\n\n**Điểm chính:**\n- Quy định tổng tín chỉ tốt nghiệp, môn học chia theo học phần.\n- Điểm học phần từ thang 10 quy đổi sang thang chữ và thang 4.\n- Sinh viên tự đăng ký học phần.\n- Tích lũy tín chỉ khi đạt điểm D (4.0/10) trở lên.\n- Có quy định thời gian đào tạo tối thiểu và tối đa."
    },
    {
        keywords: ["đơn xin nghỉ học", "bảo lưu kết quả", "thủ tục nghỉ học", "thủ tục bảo lưu"],
        reply: "**Điều kiện:**\n- Ốm đau/tai nạn (có xác nhận y tế).\n- Lý do cá nhân chính đáng (được Hiệu trưởng duyệt).\n- Đi nghĩa vụ quân sự.\n\n**Thủ tục:**\n- Viết đơn xin nghỉ học tạm thời/bảo lưu kết quả.\n- Kèm theo các giấy tờ minh chứng hợp lệ.\n- Nộp đơn tại Phòng Công tác Sinh viên hoặc Khoa/Viện quản lý ngành học để được hướng dẫn chi tiết."
    },
    {
        keywords: ["chính sách đạo văn", "gian lận ", " đạo văn", "xử lý gian lận"],
        reply: "Sổ tay sinh viên 2023 (trang 19) quy định rõ các hình thức kỷ luật cho hành vi vi phạm:\n\n**Các hành vi bị xử lý:**\n- **Khiển trách:** Chép bài/cho chép bài trong kiểm tra thường xuyên/giữa kỳ.\n- **Cảnh cáo:** Mang tài liệu/điện thoại trái phép vào phòng thi, nhắc bài, tổ chức chép bài.\n- **Đình chỉ học tập (1 học kỳ - 1 năm):** Thi hộ/nhờ thi hộ, làm bài hộ/nhờ làm bài hộ, tổ chức gian lận thi cử.\n- **Buộc thôi học:** Tái phạm các vi phạm đã bị kỷ luật cảnh cáo/đình chỉ, hoặc vi phạm đặc biệt nghiêm trọng.\n\nCác hành vi liên quan đến 'đạo văn' (như làm bài hộ, sao chép không trích dẫn) cũng được xem xét xử lý nghiêm khắc."
    },///
    {
        "keywords": ["trường có hỗ trợ tìm kiếm chỗ thực tập không", "hỗ trợ thực tập", "tìm chỗ thực tập", "cơ hội thực tập", "sinh viên có được hỗ trợ thực tập không","thực tập"],
        "reply": "Có. Trường Đại học Tây Nguyên có hỗ trợ sinh viên tìm kiếm chỗ thực tập.\n\nNgày hội việc làm của trường được tổ chức với mục đích thúc đẩy hợp tác giữa Nhà trường và các đơn vị doanh nghiệp, trong đó bao gồm cả việc tạo cơ hội thực tập.\n\nPhó Hiệu trưởng đã nhấn mạnh rằng các doanh nghiệp đã dành \"400 cơ hội thực tế tại cơ sở\" cho sinh viên. Văn bản cũng khẳng định Nhà trường nhận được sự đồng hành của doanh nghiệp trong nhiều phương diện, bao gồm \"hỗ trợ thực tập tại cơ sở\".\n\nNgoài ra, trường cũng đã ký kết biên bản ghi nhớ hợp tác với các doanh nghiệp để tăng cường kết nối và tạo cơ hội cho sinh viên."
    },
    {
        "keywords": ["dự án nghiên cứu tiêu biểu của sinh viên", "đồ án môn học tiêu biểu của sinh viên", "dự án nghiên cứu sinh viên CNTT", "đồ án sinh viên cntt","dự án","đồ án"],
        "reply": "Dựa trên buổi sinh hoạt học thuật ngày 24/11/2022 của Bộ môn CNTT, có một dự án nghiên cứu tiêu biểu của sinh viên được nhắc đến, đó là:\n\n**XÂY DỰNG BẢN ĐỒ LƯU TRÚ CỦA SINH VIÊN TRÊN WEBSITE**\n- Mã đề tài: T2022-05SV\n- Trình bày: SV. Huỳnh Hoàng Hiến, Trần Hoàng Anh Vũ"
    },
    {
        "keywords": ["liên hệ phòng ban", "học phí", "cấp lại thẻ sinh viên", "ký túc xá", "bằng cấp", "liên hệ về vấn đề", "phòng ban nào để hỏi"],
        "reply": "Để hỏi về các vấn đề cụ thể, em có thể liên hệ các phòng ban sau:\n\n- **Học phí, các khoản thu, bảo hiểm:** Phòng Kế hoạch - Tài chính.\n- **Cấp lại thẻ sinh viên, giấy tờ hành chính (xác nhận sinh viên, bảng điểm):** Phòng Công tác Sinh viên.\n- **Đăng ký môn học, chuyển ngành, quy chế đào tạo, tốt nghiệp:** Phòng Đào tạo (hoặc Phòng Đào tạo và Công tác Sinh viên tùy cơ cấu cụ thể).\n- **Ký túc xá:** Ban Quản lý Ký túc xá.\n- **Vấn đề y tế:** Phòng Y tế.\n- **Vấn đề học tập chuyên môn, cố vấn học tập:** Văn phòng Khoa/Bộ môn chủ quản của em.\n\nThông tin liên hệ chi tiết (số điện thoại, email, địa chỉ) thường được đăng tải trên website chính thức của trường hoặc website của từng phòng ban."
    },
    {
        "keywords": ["cách liên hệ cố vấn học tập", "cố vấn học tập của em là gì", "tìm cố vấn học tập", "cách gặp cố vấn"],
        "reply": "Cách liên hệ cố vấn học tập của em thường là:\n\n1.  **Thông qua Văn phòng Khoa/Bộ môn:** Em có thể liên hệ trực tiếp văn phòng Khoa/Bộ môn của mình. Họ sẽ cung cấp thông tin về cố vấn học tập được phân công cho lớp/khóa của em và cách liên lạc (email, số điện thoại, lịch trực).\n2.  **Email hoặc số điện thoại:** Nếu đã biết tên cố vấn học tập, em có thể tìm email hoặc số điện thoại của thầy/cô trên cổng thông tin sinh viên hoặc website của khoa/trường.\n3.  **Lịch hẹn:** Nhiều cố vấn học tập có lịch trực hoặc lịch hẹn cụ thể. Em nên chủ động liên hệ để đặt lịch gặp."
    },
     {
        "keywords": ["phòng máy tính của khoa", "phòng máy tính", "vị trí phòng máy tính", "máy tính trường"],
        "reply": "Phòng máy tính của trường nằm ở toà nhà số 7, tầng 4, các phòng 7.4.27, 7.4.28, 7.4.29, 7.4.30. Tổng cộng có 4 phòng máy tính."
    },
    { keywords: ["chào", "hello", "hi", "xin chào"], reply: "Chào bạn! Tôi là chatbot hỗ trợ học tập cho sinh viên CNTT trường ĐHTN. Bạn có câu hỏi gì về môn học không?" },
    {
        keywords: ["cách rút học phần", "hủy học phần đã đăng ký", "bỏ môn học", "rút môn học"],
        reply: "Cách rút/hủy học phần đã đăng ký:\n* Bạn cần theo dõi thông báo chính thức từ phòng đào tạo hoặc cổng thông tin sinh viên của trường về thời gian và quy trình rút/hủy học phần.\n* Thông thường, việc rút/hủy học phần chỉ được thực hiện trong một khoảng thời gian nhất định sau khi bắt đầu học kỳ.\n* Có thể bạn sẽ cần nộp đơn yêu cầu hoặc thực hiện trực tiếp trên hệ thống đăng ký học phần. Lưu ý về các khoản phí phát sinh hoặc ảnh hưởng đến số tín chỉ tối thiểu/tối đa."
    }
    ];
    for (const entry of fixedResponses) {
    // Vòng lặp ngoài: Duyệt qua từng "mục" trong mảng fixedResponses

    for (const keyword of entry.keywords) {
        // Vòng lặp trong: Duyệt qua từng "từ khóa" trong mảng keywords của mỗi "mục"

        if (userInput.includes(keyword)) {
            // Kiểm tra: Nếu userInput (tin nhắn của người dùng) chứa từ khóa hiện tại

            return entry.reply;
            // Trả về: Trả về phản hồi tương ứng với mục chứa từ khóa đó và dừng hàm
        }
    }
}
    // 2. Xử lý câu hỏi về học kỳ
    const hocKyMatch = userInput.match(/học kỳ (\d+)|hk(\d+)/);
    if (hocKyMatch) {
        const hocKyNum = parseInt(hocKyMatch[1] || hocKyMatch[2]);
        const coursesInSemester = courseData.filter(course => course.hocKy === hocKyNum);
        if (coursesInSemester.length > 0) {
            let reply = `Dưới đây là các môn học trong Học kỳ ${hocKyNum}:\n`;
            coursesInSemester.forEach(course => {
                reply += `- **${course.tenMonHoc}** (${course.tinChi} tín chỉ) [${course.maHP}]\n`;
                reply += `  Mô tả: ${course.moTa || "Không có mô tả chi tiết."}\n`;
                if (course.taiLieu) {
                    reply += `  Tài liệu tham khảo: <a href="${course.taiLieu}" target="_blank">${course.taiLieu}</a>\n`;
                }
            });
            return reply;
        } else {
            return `Xin lỗi, tôi không tìm thấy thông tin môn học nào cho Học kỳ ${hocKyNum}. Vui lòng kiểm tra lại số học kỳ.`;
        }
    }

    // 3. Xử lý câu hỏi về môn học cụ thể (tìm theo tên hoặc mã)
    // Cải tiến để tìm kiếm linh hoạt hơn
    let foundCourses = [];

    // Tạo một danh sách các từ khóa tiềm năng từ tên môn học và mã học phần
    const courseKeywords = courseData.flatMap(course => [
        course.tenMonHoc.toLowerCase(),
        course.maHP.toLowerCase()
    ]);

    // Duyệt qua các từ khóa của môn học để tìm kiếm trong userInput
    for (const keyword of courseKeywords) {
        if (userInput.includes(keyword)) {
            // Nếu tìm thấy từ khóa, thêm tất cả các môn học liên quan đến từ khóa đó
            // Điều này có thể trả về nhiều môn nếu các từ khóa trùng lặp
            const matchingCourses = courseData.filter(course =>
                course.tenMonHoc.toLowerCase().includes(keyword) ||
                course.maHP.toLowerCase().includes(keyword)
            );
            foundCourses.push(...matchingCourses);
        }
    }
    


    

    // Loại bỏ các môn học trùng lặp nếu có
    foundCourses = Array.from(new Set(foundCourses));

    if (foundCourses.length > 0) {
        let reply = "Thông tin về môn học bạn hỏi:\n";
        foundCourses.forEach(course => {
            reply += `- **${course.tenMonHoc}** (${course.tinChi} tín chỉ) [${course.maHP}]\n`;
            reply += `  Học kỳ: ${course.hocKy}\n`;
            reply += `  Mô tả: ${course.moTa || "Không có mô tả chi tiết."}\n`;
            if (course.taiLieu) {
                reply += `  Tài liệu tham khảo: <a href="${course.taiLieu}" target="_blank">${course.taiLieu}</a>\n`;
            }
        });
        return reply;
    }

    

    

    return null; // Trả về null nếu không tìm thấy phản hồi từ dữ liệu cục bộ
};


// Make the API call and generate the bot's response
const generateResponse = async (botMsgDiv) => {
    const textElement = botMsgDiv.querySelector(".message-text");
    controller = new AbortController();

    const userQuery = userData.message;
    const localReply = getLocalResponse(userQuery);

    if (localReply) {
        // Nếu có phản hồi từ dữ liệu cục bộ, sử dụng nó
        typingEffect(localReply, textElement, botMsgDiv);
        chatHistory.push({ role: "model", parts: [{ text: localReply }] });
    } else {
        // Nếu không, gửi yêu cầu đến Gemini API
        chatHistory.push({
            role: "user",
            parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])],
        });
        try {
            // Send the chat history to the API to get a response
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: chatHistory }),
                signal: controller.signal,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error.message);
            // Process the response text and display with typing effect
            const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
            typingEffect(responseText, textElement, botMsgDiv);
            chatHistory.push({ role: "model", parts: [{ text: responseText }] });
        } catch (error) {
            textElement.textContent = error.name === "AbortError" ? "Response generation stopped." : error.message;
            textElement.style.color = "#d62939";
            botMsgDiv.classList.remove("loading");
            document.body.classList.remove("bot-responding");
            scrollToBottom();
        }
    }
    userData.file = {}; // Đặt lại file data sau khi xử lý (dù là local hay API)
};

// Handle the form submission
const handleFormSubmit = (e) => {
    e.preventDefault();
    const userMessage = promptInput.value.trim();
    if (!userMessage || document.body.classList.contains("bot-responding")) return;
    userData.message = userMessage;
    promptInput.value = "";
    document.body.classList.add("chats-active", "bot-responding");
    fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
    // Generate user message HTML with optional file attachment
    const userMsgHTML = `
      <p class="message-text"></p>
      ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />` : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}
    `;
    const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
    userMsgDiv.querySelector(".message-text").textContent = userData.message;
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();
    setTimeout(() => {
        // Generate bot message HTML and add in the chat container
        const botMsgHTML = `<img class="avatar" src="gemini.svg" /> <p class="message-text">Just a sec...</p>`;
        const botMsgDiv = createMessageElement(botMsgHTML, "bot-message", "loading");
        chatsContainer.appendChild(botMsgDiv);
        scrollToBottom();
        generateResponse(botMsgDiv);
    }, 600); // 600 ms delay
};
// Handle file input change (file upload)
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
        fileInput.value = "";
        const base64String = e.target.result.split(",")[1];
        fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
        fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");
        // Store file data in userData obj
        userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
    };
});
// Cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
    userData.file = {};
    fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
});
// Stop Bot Response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
    controller?.abort();
    userData.file = {};
    clearInterval(typingInterval);
    chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
    document.body.classList.remove("bot-responding");
});
// Toggle dark/light theme
themeToggleBtn.addEventListener("click", () => {
    const isLightTheme = document.body.classList.toggle("light-theme");
    localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
    themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
});
// Delete all chats
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
    chatHistory.length = 0;
    chatsContainer.innerHTML = "";
    document.body.classList.remove("chats-active", "bot-responding");
});
// Handle suggestions click
document.querySelectorAll(".suggestions-item").forEach((suggestion) => {
    suggestion.addEventListener("click", () => {
        promptInput.value = suggestion.querySelector(".text").textContent;
        promptForm.dispatchEvent(new Event("submit"));
    });
});
// Show/hide controls for mobile on prompt input focus
document.addEventListener("click", ({ target }) => {
    const wrapper = document.querySelector(".prompt-wrapper");
    const shouldHide = target.classList.contains("prompt-input") || (wrapper.classList.contains("hide-controls") && (target.id === "add-file-btn" || target.id === "stop-response-btn"));
    wrapper.classList.toggle("hide-controls", shouldHide);
});
// Add event listeners for form submission and file input click
promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());
// Biến cho Web Speech API
const micBtn = document.querySelector("#mic-btn");
let recognition;
let isRecording = false;

// Khởi tạo Web Speech API
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false; // Ghi âm một lần, dừng khi người dùng ngừng nói
    recognition.interimResults = false; // Chỉ trả về kết quả cuối cùng
    recognition.lang = 'vi-VN'; // Ngôn ngữ nhận diện: Tiếng Việt

    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add("recording");
        micBtn.textContent = "mic_off"; // Thay đổi icon khi đang ghi âm
        promptInput.placeholder = "Đang nghe...";
        promptInput.focus();
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        promptInput.value = transcript;
        console.log("Bạn nói: ", transcript);
        promptForm.dispatchEvent(new Event("submit")); // Tự động gửi form
    };

    recognition.onerror = (event) => {
        console.error("Lỗi nhận diện giọng nói:", event.error);
        if (event.error === 'no-speech') {
            alert('Không nhận diện được giọng nói nào. Vui lòng nói rõ hơn.');
        } else if (event.error === 'not-allowed') {
            alert('Không cho phép truy cập micro. Vui lòng cấp quyền truy cập micro trong cài đặt trình duyệt.');
        }
        isRecording = false;
        micBtn.classList.remove("recording");
        micBtn.textContent = "mic"; // Trả lại icon micro ban đầu
        promptInput.placeholder = "Ask Gemini";
    };

    recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove("recording");
        micBtn.textContent = "mic"; // Trả lại icon micro ban đầu
        promptInput.placeholder = "Ask Gemini";
    };

    micBtn.addEventListener("click", () => {
        if (isRecording) {
            recognition.stop();
        } else {
            // Hỏi quyền truy cập micro nếu chưa có
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(() => {
                    recognition.start();
                })
                .catch(err => {
                    alert('Vui lòng cho phép truy cập micro để sử dụng tính năng này.');
                    console.error('Lỗi truy cập micro:', err);
                });
        }
    });

} else {
    // Thông báo nếu trình duyệt không hỗ trợ Web Speech API
    micBtn.style.display = 'none'; // Ẩn nút micro
    console.warn("Trình duyệt của bạn không hỗ trợ Web Speech API. Tính năng nhập liệu bằng giọng nói không khả dụng.");
    alert("Trình duyệt của bạn không hỗ trợ nhập liệu bằng giọng nói. Vui lòng sử dụng trình duyệt Chrome để có trải nghiệm tốt nhất.");
}
