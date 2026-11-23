'use strict';

// Seed skills taxonomy (AI_DESIGN §2.6, task A3). Synthetic/public knowledge only.
// Line format:  Canonical name | alias1; alias2; ...   (aliases are free text, VN and EN)
// `normalized_name` and alias keys are derived with normalizeSkill(). Aliases must be unique across skills
// (enforced by tests). Curated by AI Engineer; PENDING PM review (A3 acceptance).

const RAW = {
  it: `
JavaScript | js; java script; ecmascript; es6
TypeScript | ts; type script
Python | python3; lap trinh python
Java | core java; lap trinh java
C++ | cpp; c plus plus
C# | csharp; c sharp
PHP | lap trinh php
Go | golang
Kotlin |
Swift |
Dart |
SQL | ngon ngu sql; truy van sql
MySQL | my sql
PostgreSQL | postgres; postgre sql
MongoDB | mongo; mongo db
Redis |
HTML | html5; html css
CSS | css3
React | reactjs; react.js; react js
Next.js | nextjs; next js
Vue.js | vue; vuejs; vue js
Angular | angularjs; angular js
Node.js | node; nodejs; node js
Express.js | express; expressjs
NestJS | nest js; nest.js
Spring Boot | spring; springboot
.NET | dotnet; asp.net; asp net core
Laravel |
Django |
Flask |
FastAPI | fast api
React Native | reactnative
Flutter |
Android | android development; lap trinh android
iOS | ios development; lap trinh ios
REST API | restful; restful api; rest; web api
GraphQL |
Git | github; gitlab; quan ly phien ban
Docker | container; dong goi docker
Kubernetes | k8s
Linux | ubuntu; unix; he dieu hanh linux
CI/CD | ci cd; github actions; jenkins
AWS | amazon web services; aws cloud
Azure | microsoft azure
Google Cloud | gcp; google cloud platform
Tailwind CSS | tailwind; tailwindcss
Bootstrap |
Figma | thiet ke figma
Software Testing | kiem thu phan mem; manual testing; testing; tester
Postman | postman api testing; kiem thu api
Jira | jira software; atlassian jira
Automation Testing | kiem thu tu dong; selenium; cypress
Data Structures and Algorithms | cau truc du lieu va giai thuat; dsa; thuat toan
OOP | lap trinh huong doi tuong; object oriented programming
Agile | scrum; kanban; phuong phap agile
Networking | mang may tinh; computer networking
Cybersecurity | an ninh mang; bao mat thong tin; information security
Computer Hardware | sua chua may tinh; phan cung may tinh; lap rap may tinh
IT Support | ho tro ky thuat; helpdesk; it helpdesk; technical support
WordPress | wordpress website; thiet ke web wordpress
Web Development | lap trinh web; phat trien web; web dev
Mobile Development | lap trinh di dong; phat trien ung dung di dong
`,
  data: `
Machine Learning | ml; hoc may
Deep Learning | hoc sau
Data Analysis | phan tich du lieu; data analytics
Data Visualization | truc quan hoa du lieu
Power BI | powerbi; microsoft power bi
Tableau |
Pandas |
NumPy |
TensorFlow |
PyTorch |
NLP | xu ly ngon ngu tu nhien; natural language processing
Statistics | thong ke; xac suat thong ke
ETL | data pipeline
Google Analytics | ga4; phan tich google analytics
`,
  office: `
Microsoft Excel | excel; ms excel; microsoft excel; tin hoc van phong excel
Microsoft Word | word; ms word
Microsoft PowerPoint | powerpoint; ms powerpoint; ppt; slide thuyet trinh
Google Sheets | google sheet; bang tinh google
Google Docs | google doc
Google Workspace | g suite; gsuite
Microsoft Outlook | outlook
Office Skills | tin hoc van phong; ky nang van phong; ms office; microsoft office
Typing | danh may; go 10 ngon; danh may nhanh
Data Entry | nhap lieu; nhap du lieu
Document Management | quan ly van ban; luu tru ho so; luu tru tai lieu
Administrative Support | hanh chinh; hanh chinh van phong; tro ly hanh chinh; van thu
Scheduling | sap xep lich; quan ly lich lam viec; sap xep lich trinh
Bookkeeping | ke toan co ban; so sach ke toan; ke toan
Accounting Software | misa; phan mem ke toan
Invoicing | lap hoa don; xuat hoa don
Customer Database Management | quan ly co so du lieu khach hang; crm; quan ly khach hang
Reception | le tan; tiep tan
Filing | sap xep ho so; luu tru ho so giay
`,
  language: `
English | tieng anh; anh van; english communication
IELTS | ielts certificate; chung chi ielts
TOEIC | toeic certificate; chung chi toeic
Vietnamese | tieng viet
Japanese | tieng nhat; nhat ngu; jlpt
Korean | tieng han; han ngu; topik
Chinese | tieng trung; hoa ngu; mandarin; hsk
French | tieng phap
German | tieng duc
Thai | tieng thai
Translation | dich thuat; bien dich; phien dich
Interpreting | phien dich viên; phien dich vien; thong dich
Proofreading | hieu dinh; soat loi chinh ta; chinh sua van ban
`,
  marketing: `
Digital Marketing | marketing so; tiep thi so; online marketing
Social Media Marketing | marketing mang xa hoi; smm; social media; quan ly fanpage
Facebook Ads | quang cao facebook; facebook advertising; meta ads
Google Ads | quang cao google; google adwords; adwords
TikTok | tiktok marketing; tiktok ads; quay tiktok
SEO | toi uu cong cu tim kiem; search engine optimization
Content Writing | viet content; viet noi dung; content creator; copywriter
Copywriting | viet quang cao; viet bai quang cao; copywrite
Email Marketing | marketing qua email; mailchimp
Content Marketing | marketing noi dung
Community Management | quan ly cong dong; quan tri group; quan tri fanpage
Brand Management | quan ly thuong hieu; branding; xay dung thuong hieu
Market Research | nghien cuu thi truong; khao sat thi truong
Event Organization | to chuc su kien; event planning; lap ke hoach su kien
Public Relations | pr; quan he cong chung; truyen thong
Influencer Marketing | koc; kol
Affiliate Marketing | tiep thi lien ket; affiliate
Video Editing | dung phim; edit video; chinh sua video; capcut
Photography | chup anh; nhiep anh
Content Planning | lap ke hoach noi dung; content calendar
`,
  design: `
Adobe Photoshop | photoshop; ps; chinh sua anh photoshop
Adobe Illustrator | illustrator; ai illustrator; thiet ke vector
Adobe Premiere Pro | premiere; premiere pro; adobe premiere
Adobe After Effects | after effects; ae; hieu ung after effects
Canva | thiet ke canva; thiet ke bang canva
Graphic Design | thiet ke do hoa; do hoa; thiet ke
UI/UX Design | ui ux; thiet ke ui ux; thiet ke giao dien; ux design; ui design
Adobe InDesign | indesign
CorelDRAW | corel draw; coreldraw
Motion Graphics | do hoa chuyen dong; motion design
3D Modeling | dung hinh 3d; thiet ke 3d; blender; 3ds max
AutoCAD | auto cad; ve ky thuat autocad; ban ve cad
SketchUp | sketch up
Drawing | ve tay; ve minh hoa; illustration
Logo Design | thiet ke logo
Banner and Poster Design | thiet ke banner; thiet ke poster; thiet ke an pham
`,
  sales: `
Sales | ban hang; kinh doanh; nhan vien kinh doanh
Telesales | ban hang qua dien thoai; telemarketing; goi dien tu van
Customer Consulting | tu van khach hang; tu van ban hang
Negotiation | dam phan; thuong luong
Lead Generation | tim kiem khach hang tiem nang; phat trien khach hang moi
CRM Software | phan mem crm; hubspot; salesforce
Online Selling | ban hang online; ban hang truc tuyen; livestream ban hang
E-commerce | thuong mai dien tu; shopee; lazada; tiktok shop; san thuong mai dien tu
Order Processing | xu ly don hang; chot don; len don
Product Knowledge | kien thuc san pham; tu van san pham
Cold Calling | goi dien cho khach hang moi; cold call
Retail Sales | ban le; nhan vien ban hang; ban hang tai cua hang
Upselling | ban them san pham; cross sell; ban cheo
Market Expansion | phat trien thi truong; mo rong thi truong
Merchandising | trung bay hang hoa; trung bay san pham; visual merchandising
`,
  service: `
Customer Service | cham soc khach hang; dich vu khach hang; cskh; ho tro khach hang
Cashiering | thu ngan; thanh toan; xu ly thanh toan
POS Systems | phan mem ban hang; may pos; pos
Food Service | phuc vu nha hang; phuc vu ban; phuc vu do an
Barista | pha che ca phe; pha che; pha ca phe
Cooking | nau an; che bien mon an; lam bep
Food Safety | an toan thuc pham; ve sinh an toan thuc pham
Cleaning | ve sinh; don dep; lam sach
Inventory Management | quan ly kho; kiem ke; kiem ke hang hoa; quan ly ton kho
Packing | dong goi; dong goi hang hoa; dong goi san pham
Delivery | giao hang; van chuyen; ship hang
Driving | lai xe; bang lai xe; bang lai b2; bang lai a1
Logistics | hau can; chuoi cung ung; logistics va kho van
Hospitality | khach san; nha hang khach san; dich vu luu tru
Tour Guiding | huong dan vien du lich; huong dan vien; thuyet minh du lich
Childcare | trong tre; cham soc tre em; giu tre
Tutoring | day kem; gia su; day hoc 1 kem 1
Teaching | giang day; day hoc; giao vien
Event Staff | nhan vien su kien; pg; pb; tiep tan su kien
Complaint Handling | xu ly khieu nai; giai quyet khieu nai
Phone Support | tong dai; truc tong dai; call center; tiep nhan cuoc goi
`,
  soft: `
Communication | giao tiep; ky nang giao tiep; ky nang truyen thong; communication skills
Teamwork | lam viec nhom; ky nang lam viec nhom; team work; hop tac
Time Management | quan ly thoi gian; ky nang quan ly thoi gian
Problem Solving | giai quyet van de; ky nang giai quyet van de
Critical Thinking | tu duy phan bien; tu duy logic; logical thinking
Leadership | lanh dao; ky nang lanh dao; dan dat nhom; truong nhom
Presentation | thuyet trinh; ky nang thuyet trinh; presentation skills
Public Speaking | noi truoc dong nguoi; dan chuong trinh; mc
Adaptability | thich nghi; kha nang thich ung; linh hoat
Creativity | sang tao; tu duy sang tao
Attention to Detail | cam than; tu mi; chu y chi tiet; ti mi
Responsibility | tinh than trach nhiem; trach nhiem
Self-Learning | tu hoc; hoc hoi nhanh; kha nang tu hoc
Project Management | quan ly du an; project manager; quan ly tien do
Planning | lap ke hoach; ky nang lap ke hoach; to chuc cong viec
Active Listening | lang nghe; ky nang lang nghe
Stress Management | chiu ap luc; chiu ap luc cong viec; lam viec duoi ap luc
Volunteering | tinh nguyen; hoat dong tinh nguyen; cong tac xa hoi
Research | nghien cuu; nghien cuu khoa hoc; tim kiem thong tin
Report Writing | viet bao cao; lam bao cao; lap bao cao
Customer Orientation | huong den khach hang; thau hieu khach hang
`,
  other: `
Human Resources | nhan su; hr; tuyen dung; tuyen dung nhan su
Recruitment | tuyen dung nhan tai; sourcing ung vien; recruiter
Payroll | tinh luong; cham cong; bang luong
Legal Document Handling | soan thao hop dong; van ban phap ly; soan thao van ban
Procurement | mua hang; thu mua; dat hang
Quality Control | kiem soat chat luong; qc; kiem tra chat luong; kiem tra hang
Machine Operation | van hanh may; van hanh may moc
Sewing | may; may mac; may cong nghiep
Electrical Repair | sua chua dien; dien dan dung; dien lanh
Warehouse Operation | thu kho; van hanh kho; nhan vien kho
Basic Finance | tai chinh co ban; quan ly tai chinh ca nhan; tai chinh
Fitness Coaching | huan luyen vien the hinh; gym; pt; huan luyen the thao
Sports | the thao; bong da; bong ro
Music | am nhac; choi nhac cu; guitar; piano
Singing and Dancing | hat; nhay; mua; bieu dien
`,
};

function parse() {
  const out = [];
  for (const [category, block] of Object.entries(RAW)) {
    for (const line of block.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      const [name, aliasPart = ''] = t.split('|');
      const aliases = aliasPart.split(';').map((a) => a.trim()).filter(Boolean);
      out.push({ name: name.trim(), category, aliases });
    }
  }
  return out;
}

module.exports = { SKILL_SEED: parse() };
