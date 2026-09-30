export type UniversityCode = 'KMUTT' | 'KMITL' | 'KMUTNB';

export interface FacultyCatalogItem {
  name: string;
  university: UniversityCode;
  aliases: string[];
  departments: string[];
}

export interface AcademicSuggestion {
  value: string;
  label?: string;
  badge?: string;
  badgeClass?: string;
  group?: string;
  isCustom?: boolean;
}

export const UNIVERSITY_NAMES: Record<UniversityCode, { shortTh: string; fullTh: string; shortEn: string }> = {
  KMUTT: { shortTh: 'มจธ. บางมด', fullTh: 'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี', shortEn: 'KMUTT' },
  KMITL: { shortTh: 'สจล. ลาดกระบัง', fullTh: 'สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง', shortEn: 'KMITL' },
  KMUTNB: { shortTh: 'มจพ. พระนครเหนือ', fullTh: 'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ', shortEn: 'KMUTNB' },
};

export const ACADEMIC_CATALOG: FacultyCatalogItem[] = [
  // ==========================================
  // KMUTT - มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี
  // ==========================================
  {
    name: 'คณะวิศวกรรมศาสตร์',
    university: 'KMUTT',
    aliases: ['วิศวะ', 'วิศวกรรม', 'Engineering', 'Eng', 'FOE'],
    departments: [
      'ภาควิชาวิศวกรรมคอมพิวเตอร์',
      'ภาควิชาวิศวกรรมเครื่องกล',
      'ภาควิชาวิศวกรรมไฟฟ้า',
      'ภาควิชาวิศวกรรมโยธา',
      'ภาควิชาวิศวกรรมเคมี',
      'ภาควิชาวิศวกรรมอุตสาหการ',
      'ภาควิชาวิศวกรรมระบบควบคุมและเครื่องมือวัด',
      'ภาควิชาวิศวกรรมสิ่งแวดล้อม',
      'ภาควิชาวิศวกรรมอิเล็กทรอนิกส์และโทรคมนาคม',
      'ภาควิชาวิศวกรรมวัสดุและเครื่องมือ',
      'สาขาวิชาวิศวกรรมอัตโนมัติ',
    ],
  },
  {
    name: 'คณะวิทยาศาสตร์',
    university: 'KMUTT',
    aliases: ['วิดยา', 'วิทยาศาสตร์', 'Science', 'Sci', 'FSci'],
    departments: [
      'ภาควิชาคณิตศาสตร์',
      'ภาควิชาเคมี',
      'ภาควิชาฟิสิกส์',
      'ภาควิชาจุลชีววิทยา',
      'สาขาวิชาวิทยาการคอมพิวเตอร์ประยุกต์',
      'สาขาวิชาสถิติประยุกต์',
    ],
  },
  {
    name: 'คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี',
    university: 'KMUTT',
    aliases: ['ครุศาสตร์', 'ครุอุต', 'FIET', 'Industrial Education'],
    departments: [
      'ภาควิชาครุศาสตร์เครื่องกล',
      'ภาควิชาครุศาสตร์โยธา',
      'ภาควิชาครุศาสตร์ไฟฟ้า',
      'ภาควิชาครุศาสตร์อุตสาหการ',
      'ภาควิชาเทคโนโลยีและสื่อสารการศึกษา',
      'สาขาวิชาเทคโนโลยีการพิมพ์และบรรจุภัณฑ์',
      'สาขาวิชาคอมพิวเตอร์และเทคโนโลยีการศึกษา',
    ],
  },
  {
    name: 'คณะเทคโนโลยีสารสนเทศ (SIT)',
    university: 'KMUTT',
    aliases: ['ไอที', 'SIT', 'IT', 'Information Technology', 'เทคโนโลยีสารสนเทศ'],
    departments: [
      'สาขาวิชาเทคโนโลยีสารสนเทศ (IT)',
      'สาขาวิชาวิทยาการคอมพิวเตอร์ (CS)',
      'สาขาวิชานวัตกรรมบริการดิจิทัล (DSI)',
    ],
  },
  {
    name: 'คณะสถาปัตยกรรมศาสตร์และการออกแบบ (SoA+D)',
    university: 'KMUTT',
    aliases: ['สถาปัตย์', 'ถาปัตย์', 'SoA+D', 'Architecture', 'Design'],
    departments: [
      'สาขาวิชาสถาปัตยกรรม (Architecture)',
      'สาขาวิชาสถาปัตยกรรมภายใน (Interior Architecture)',
      'สาขาวิชาการออกแบบอุตสาหกรรม (Industrial Design)',
      'สาขาวิชาการออกแบบนิเทศศิลป์ (Communication Design)',
    ],
  },
  {
    name: 'สถาบันวิทยาการหุ่นยนต์ภาคสนาม (FIBO)',
    university: 'KMUTT',
    aliases: ['ฟีโบ้', 'หุ่นยนต์', 'FIBO', 'Robotics'],
    departments: [
      'สาขาวิชาวิศวกรรมหุ่นยนต์และระบบอัตโนมัติ',
    ],
  },
  {
    name: 'คณะพลังงาน สิ่งแวดล้อมและวัสดุ',
    university: 'KMUTT',
    aliases: ['พลังงาน', 'SEEM', 'Energy'],
    departments: [
      'สายวิชาเทคโนโลยีพลังงาน',
      'สายวิชาเทคโนโลยีสิ่งแวดล้อม',
      'สายวิชาเทคโนโลยีวัสดุ',
      'สายวิชาเทคโนโลยีการจัดการพลังงาน',
    ],
  },
  {
    name: 'คณะศิลปศาสตร์',
    university: 'KMUTT',
    aliases: ['ศิลปศาสตร์', 'Liberal Arts', 'SoLA', 'ภาษา'],
    departments: [
      'สายวิชาภาษา',
      'สายวิชามนุษยศาสตร์และสังคมศาสตร์',
    ],
  },
  {
    name: 'บัณฑิตวิทยาลัยการจัดการและนวัตกรรม (GMI)',
    university: 'KMUTT',
    aliases: ['GMI', 'Management', 'บริหาร'],
    departments: [
      'สาขาวิชาการจัดการสำหรับการเป็นผู้ประกอบการ',
      'สาขาวิชาการจัดการโลจิสติกส์',
    ],
  },

  // ==========================================
  // KMITL - สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง
  // ==========================================
  {
    name: 'คณะวิศวกรรมศาสตร์',
    university: 'KMITL',
    aliases: ['วิศวะ', 'วิศวกรรม', 'Engineering', 'Eng', 'SEng'],
    departments: [
      'ภาควิชาวิศวกรรมคอมพิวเตอร์',
      'ภาควิชาวิศวกรรมไฟฟ้า',
      'ภาควิชาวิศวกรรมเครื่องกล',
      'ภาควิชาวิศวกรรมโยธา',
      'ภาควิชาวิศวกรรมโทรคมนาคม',
      'ภาควิชาวิศวกรรมอิเล็กทรอนิกส์',
      'ภาควิชาวิศวกรรมเคมี',
      'ภาควิชาวิศวกรรมอุตสาหการ',
      'ภาควิชาวิศวกรรมชีวการแพทย์',
      'ภาควิชาวิศวกรรมอาหาร',
      'ภาควิชาวิศวกรรมเกษตรอัจฉริยะ',
      'ภาควิชาวิศวกรรมอัตโนมัติ',
      'ภาควิชาวิศวกรรมหุ่นยนต์และปัญญาประดิษฐ์ (Robotics & AI)',
      'ภาควิชาวิศวกรรมการบินและอวกาศ',
      'ภาควิชาวิศวกรรมสิ่งแวดล้อม',
      'ภาควิชาวิศวกรรมระบบไอโอทีและสารสนเทศ',
      'ภาควิชาวิศวกรรมดนตรีและสื่อประสม',
    ],
  },
  {
    name: 'คณะสถาปัตยกรรม ศิลปะและการออกแบบ',
    university: 'KMITL',
    aliases: ['สถาปัตย์', 'ถาปัตย์', 'Architecture', 'Design', 'Art', 'AAD'],
    departments: [
      'ภาควิชาสถาปัตยกรรม',
      'ภาควิชาการออกแบบตกแต่งภายใน',
      'ภาควิชาการออกแบบสนเทศและนิเทศศิลป์',
      'ภาควิชาศิลปกรรม',
      'ภาควิชาการออกแบบอุตสาหกรรม',
      'ภาควิชาการวางแผนภาคและเมือง',
    ],
  },
  {
    name: 'คณะวิทยาศาสตร์',
    university: 'KMITL',
    aliases: ['วิดยา', 'วิทยาศาสตร์', 'Science', 'Sci'],
    departments: [
      'ภาควิชาคณิตศาสตร์',
      'ภาควิชาเคมี',
      'ภาควิชาฟิสิกส์',
      'ภาควิชาชีววิทยาประยุกต์',
      'ภาควิชาวิทยาการคอมพิวเตอร์',
      'ภาควิชาสถิติประยุกต์',
    ],
  },
  {
    name: 'คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี',
    university: 'KMITL',
    aliases: ['ครุศาสตร์', 'ครุอุต', 'Industrial Education'],
    departments: [
      'ภาควิชาครุศาสตร์วิศวกรรม',
      'ภาควิชาครุศาสตร์สถาปัตยกรรมและการออกแบบ',
      'ภาควิชาครุศาสตร์เกษตร',
      'ภาควิชาครุศาสตร์อุตสาหการ',
    ],
  },
  {
    name: 'คณะเทคโนโลยีสารสนเทศ',
    university: 'KMITL',
    aliases: ['ไอที', 'IT', 'Information Technology'],
    departments: [
      'สาขาวิชาเทคโนโลยีสารสนเทศ',
      'สาขาวิชาวิทยาการข้อมูลและการวิเคราะห์เชิงธุรกิจ (Data Science)',
      'สาขาวิชาการพัฒนาซอฟต์แวร์ (Software Development)',
    ],
  },
  {
    name: 'คณะเทคโนโลยีการเกษตร',
    university: 'KMITL',
    aliases: ['เกษตร', 'Agriculture'],
    departments: [
      'ภาควิชาการผลิตพืช',
      'ภาควิชาสัตวศาสตร์และประมง',
      'ภาควิชาพัฒนาการเกษตรและการจัดการทรัพยากร',
    ],
  },
  {
    name: 'คณะอุตสาหกรรมอาหาร',
    university: 'KMITL',
    aliases: ['อุตสาหกรรมอาหาร', 'Food Industry', 'Food Science'],
    departments: [
      'สาขาวิชาวิทยาศาสตร์และเทคโนโลยีการอาหาร',
      'สาขาวิชาวิศวกรรมการแปรรูปอาหาร',
    ],
  },
  {
    name: 'คณะบริหารธุรกิจ (KBS)',
    university: 'KMITL',
    aliases: ['บริหารธุรกิจ', 'บริหาร', 'Business', 'KBS', 'การบัญชี', 'การเงิน', 'การตลาด'],
    departments: [
      'สาขาวิชาการจัดการและนวัตกรรม',
      'สาขาวิชาการเงิน',
      'สาขาวิชาการตลาด',
      'สาขาวิชาการเป็นผู้ประกอบการระดับโลก',
      'สาขาวิชาการบัญชี',
    ],
  },
  {
    name: 'คณะศิลปศาสตร์',
    university: 'KMITL',
    aliases: ['ศิลปศาสตร์', 'Liberal Arts', 'ภาษาอังกฤษ', 'ภาษาญี่ปุ่น'],
    departments: [
      'สาขาวิชาภาษาอังกฤษเพื่อการสื่อสารระดับโลก',
      'สาขาวิชาภาษาญี่ปุ่น',
      'สาขาวิชานวัตกรรมการท่องเที่ยวและการบริการ',
    ],
  },
  {
    name: 'คณะแพทยศาสตร์',
    university: 'KMITL',
    aliases: ['หมอ', 'แพทย์', 'Medicine', 'Medical'],
    departments: [
      'สาขาวิชาแพทยศาสตร์',
    ],
  },
  {
    name: 'คณะพยาบาลศาสตร์',
    university: 'KMITL',
    aliases: ['พยาบาล', 'Nursing'],
    departments: [
      'สาขาวิชาพยาบาลศาสตร์',
    ],
  },
  {
    name: 'คณะทันตแพทยศาสตร์',
    university: 'KMITL',
    aliases: ['ทันตะ', 'หมอฟัน', 'Dentistry'],
    departments: [
      'สาขาวิชาทันตแพทยศาสตร์',
    ],
  },
  {
    name: 'วิทยาลัยอุตสาหกรรมการบินนานาชาติ (IAAI)',
    university: 'KMITL',
    aliases: ['การบิน', 'IAAI', 'Aviation', 'นักบิน'],
    departments: [
      'สาขาวิชาวิศวกรรมการบินและนักบินพาณิชย์',
      'สาขาวิชาการจัดการโลจิสติกส์การบิน',
    ],
  },
  {
    name: 'วิทยาลัยนวัตกรรมการผลิตขั้นสูง (AMI)',
    university: 'KMITL',
    aliases: ['AMI', 'Advanced Manufacturing'],
    departments: [
      'สาขาวิชาวิศวกรรมระบบการผลิตขั้นสูง',
    ],
  },
  {
    name: 'วิทยาลัยเทคโนโลยีและนวัตกรรมวัสดุ (CMTI)',
    university: 'KMITL',
    aliases: ['CMTI', 'Materials', 'วัสดุ'],
    departments: [
      'สาขาวิชาเทคโนโลยีและนวัตกรรมวัสดุ',
    ],
  },

  // ==========================================
  // KMUTNB - มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ
  // ==========================================
  {
    name: 'คณะวิศวกรรมศาสตร์',
    university: 'KMUTNB',
    aliases: ['วิศวะ', 'วิศวกรรม', 'Engineering', 'Eng'],
    departments: [
      'ภาควิชาวิศวกรรมเครื่องกลและการบิน-อวกาศ',
      'ภาควิชาวิศวกรรมไฟฟ้าและคอมพิวเตอร์',
      'ภาควิชาวิศวกรรมการผลิต',
      'ภาควิชาวิศวกรรมเคมี',
      'ภาควิชาวิศวกรรมโยธา',
      'ภาควิชาวิศวกรรมอุตสาหการ',
      'ภาควิชาวิศวกรรมวัสดุและเทคโนโลยีการผลิต',
      'ภาควิชาวิศวกรรมขนถ่ายวัสดุและโลจิสติกส์',
    ],
  },
  {
    name: 'คณะวิทยาศาสตร์ประยุกต์',
    university: 'KMUTNB',
    aliases: ['วิทยาศาสตร์ประยุกต์', 'วิดยา', 'Applied Science', 'FAS'],
    departments: [
      'ภาควิชาคณิตศาสตร์ประยุกต์',
      'ภาควิชาเคมีอุตสาหกรรม',
      'ภาควิชาฟิสิกส์อุตสาหกรรมและอุปกรณ์การแพทย์',
      'ภาควิชาวิทยาการคอมพิวเตอร์และสารสนเทศ',
      'ภาควิชาสถิติประยุกต์',
      'ภาควิชาเทคโนโลยีชีวภาพ',
      'ภาควิชาเทคโนโลยีสิ่งแวดล้อม',
    ],
  },
  {
    name: 'คณะครุศาสตร์อุตสาหกรรม',
    university: 'KMUTNB',
    aliases: ['ครุศาสตร์', 'ครุอุต', 'Technical Education', 'FTE'],
    departments: [
      'ภาควิชาครุศาสตร์เครื่องกล',
      'ภาควิชาครุศาสตร์ไฟฟ้า',
      'ภาควิชาครุศาสตร์โยธา',
      'ภาควิชาเทคโนโลยีคอมพิวเตอร์',
      'ภาควิชาบริหารเทคนิคศึกษา',
    ],
  },
  {
    name: 'วิทยาลัยเทคโนโลยีอุตสาหกรรม (CIT)',
    university: 'KMUTNB',
    aliases: ['CIT', 'วทอ', 'เทคโนโลยีอุตสาหกรรม'],
    departments: [
      'ภาควิชาเทคโนโลยีวิศวกรรมเครื่องกล',
      'ภาควิชาเทคโนโลยีวิศวกรรมไฟฟ้า',
      'ภาควิชาเทคโนโลยีวิศวกรรมโยธา',
      'ภาควิชาเทคโนโลยีวิศวกรรมอุตสาหการ',
      'ภาควิชาเทคโนโลยีวิศวกรรมอิเล็กทรอนิกส์',
      'ภาควิชาการจัดการเทคโนโลยีการผลิตและสารสนเทศ',
      'ภาควิชาเทคโนโลยีวิศวกรรมการเชื่อม',
    ],
  },
  {
    name: 'คณะเทคโนโลยีสารสนเทศและนวัตกรรมดิจิทัล (ITDI)',
    university: 'KMUTNB',
    aliases: ['ไอที', 'IT', 'ITDI', 'Digital Innovation'],
    departments: [
      'ภาควิชาเทคโนโลยีสารสนเทศ',
      'ภาควิชาวิทยาการข้อมูลและระบบสารสนเทศอัจฉริยะ',
    ],
  },
  {
    name: 'คณะพัฒนาธุรกิจและอุตสาหกรรม',
    university: 'KMUTNB',
    aliases: ['พัฒนาธุรกิจ', 'Business Development', 'BID'],
    departments: [
      'ภาควิชาการพัฒนาธุรกิจอุตสาหกรรมและทรัพยากรมนุษย์',
      'ภาควิชาการบริหารอุตสาหกรรมการผลิตและบริการ',
    ],
  },
  {
    name: 'คณะศิลปศาสตร์ประยุกต์',
    university: 'KMUTNB',
    aliases: ['ศิลปศาสตร์ประยุกต์', 'Applied Arts', 'ภาษา'],
    departments: [
      'ภาควิชาภาษา',
      'ภาควิชาสังคมศาสตร์',
      'ภาควิชามนุษยศาสตร์',
    ],
  },
  {
    name: 'คณะเทคโนโลยีและการจัดการอุตสาหกรรม (ปราจีนบุรี)',
    university: 'KMUTNB',
    aliases: ['ปราจีนบุรี', 'FITM'],
    departments: [
      'ภาควิชาเทคโนโลยีการออกแบบและผลิตเครื่องจักรกล',
      'ภาควิชาการจัดการอุตสาหกรรม',
      'ภาควิชาเทคโนโลยีสารสนเทศ',
      'ภาควิชาคอมพิวเตอร์ช่วยออกแบบและบริหารงานก่อสร้าง',
      'ภาควิชาเทคโนโลยีชีวกระบวนการ',
    ],
  },
  {
    name: 'คณะอุตสาหกรรมเกษตร (ปราจีนบุรี)',
    university: 'KMUTNB',
    aliases: ['อุตสาหกรรมเกษตร', 'Agro-Industry', 'ปราจีนบุรี'],
    departments: [
      'ภาควิชาเทคโนโลยีอุตสาหกรรมเกษตรและการจัดการ',
      'ภาควิชานวัตกรรมและเทคโนโลยีการพัฒนาผลิตภัณฑ์',
    ],
  },
  {
    name: 'คณะวิศวกรรมศาสตร์และเทคโนโลยี (ระยอง)',
    university: 'KMUTNB',
    aliases: ['วิศวะระยอง', 'ระยอง', 'FET'],
    departments: [
      'ภาควิชาเทคโนโลยีวิศวกรรมเครื่องกลและกระบวนการ',
      'ภาควิชาเทคโนโลยีวิศวกรรมอุตสาหการและโลจิสติกส์',
      'ภาควิชาเทคโนโลยีวิศวกรรมไฟฟ้าและเครื่องมือวัด',
      'ภาควิชาวิศวกรรมพอลิเมอร์',
    ],
  },
  {
    name: 'คณะวิทยาศาสตร์ พลังงานและสิ่งแวดล้อม (ระยอง)',
    university: 'KMUTNB',
    aliases: ['วิดยาระยอง', 'ScEEn', 'ระยอง'],
    departments: [
      'ภาควิชาวิทยาศาสตร์และเทคโนโลยี',
      'ภาควิชากระบวนการอุตสาหกรรมเคมีและสิ่งแวดล้อม',
    ],
  },
  {
    name: 'คณะบริหารธุรกิจและอุตสาหกรรมบริการ (ปราจีนบุรี)',
    university: 'KMUTNB',
    aliases: ['บริหารปราจีนบุรี', 'BAS'],
    departments: [
      'ภาควิชาบริหารธุรกิจการท่องเที่ยวและการโรงแรม',
      'ภาควิชาบริหารธุรกิจ',
    ],
  },
  {
    name: 'วิทยาลัยนานาชาติ (International College)',
    university: 'KMUTNB',
    aliases: ['นานาชาติ', 'International'],
    departments: [
      'สาขาวิชาการค้าระหว่างประเทศและโลจิสติกส์ธุรกิจ',
    ],
  },
];

export function getUniversityBadge(uni?: string): { badge: string; badgeClass: string } {
  if (uni === 'KMITL') return { badge: 'สจล. KMITL', badgeClass: 'badge-tag--kmitl' };
  if (uni === 'KMUTT') return { badge: 'มจธ. KMUTT', badgeClass: 'badge-tag--kmutt' };
  if (uni === 'KMUTNB') return { badge: 'มจพ. KMUTNB', badgeClass: 'badge-tag--kmutnb' };
  return { badge: uni || '', badgeClass: 'badge-tag--tech-uni' };
}

function normalizeSearch(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Searches and returns faculties across all 3 universities.
 * If userUniversity is provided, puts faculties belonging to user's university first.
 * If query doesn't match an exact faculty name, appends an option to use the query as custom faculty.
 */
export function searchFaculties(
  rawQuery: string,
  userUniversity?: string,
): AcademicSuggestion[] {
  const query = rawQuery.trim();
  const normQuery = normalizeSearch(query);
  const results: AcademicSuggestion[] = [];

  // Group items by whether they match user's university
  const primary: FacultyCatalogItem[] = [];
  const secondary: FacultyCatalogItem[] = [];

  for (const item of ACADEMIC_CATALOG) {
    if (userUniversity && item.university === userUniversity) {
      primary.push(item);
    } else {
      secondary.push(item);
    }
  }

  const allOrdered = [...primary, ...secondary];
  const seenFacultyNames = new Set<string>();

  for (const item of allOrdered) {
    // If there is a query, check if item matches
    if (normQuery) {
      const matchName = normalizeSearch(item.name).includes(normQuery);
      const matchUni = normalizeSearch(item.university).includes(normQuery) ||
                       normalizeSearch(UNIVERSITY_NAMES[item.university]?.shortTh || '').includes(normQuery) ||
                       normalizeSearch(UNIVERSITY_NAMES[item.university]?.fullTh || '').includes(normQuery);
      const matchAliases = item.aliases.some((alias) => normalizeSearch(alias).includes(normQuery));
      const matchDepts = item.departments.some((dept) => normalizeSearch(dept).includes(normQuery));

      if (!matchName && !matchUni && !matchAliases && !matchDepts) {
        continue;
      }
    }

    const { badge, badgeClass } = getUniversityBadge(item.university);
    const key = `${item.name}::${item.university}`;
    if (seenFacultyNames.has(key)) continue;
    seenFacultyNames.add(key);

    const isUserUni = userUniversity && item.university === userUniversity;
    const groupName = normQuery
      ? undefined
      : isUserUni
      ? `แนะนำตามสถาบันของคุณ (${UNIVERSITY_NAMES[item.university].shortTh})`
      : `สถาบันอื่น (${UNIVERSITY_NAMES[item.university].shortTh})`;

    results.push({
      value: item.name,
      label: item.name,
      badge,
      badgeClass,
      ...(groupName ? { group: groupName } : {}),
    });
  }

  // Deduplicate entries if identical name and badge already shown
  // But allow identical names from different universities if badge differs
  const finalSuggestions: AcademicSuggestion[] = [];
  const registeredValues = new Set<string>();

  for (const item of results) {
    const compound = `${item.value}|${item.badge}`;
    if (!registeredValues.has(compound)) {
      registeredValues.add(compound);
      finalSuggestions.push(item);
    }
  }

  // If user typed something and none of the suggestions is an exact match for what was typed,
  // offer the option to add/use it as a custom faculty!
  if (query) {
    const hasExactMatch = finalSuggestions.some(
      (s) => s.value.trim().toLowerCase() === query.toLowerCase(),
    );
    if (!hasExactMatch) {
      finalSuggestions.push({
        value: query,
        label: `➕ ใช้ "${query}" เป็นคณะของคุณ (ระบุเอง)`,
        group: 'ตัวเลือกที่คุณกำหนดเอง',
        isCustom: true,
      });
    }
  }

  return finalSuggestions;
}

/**
 * Searches and returns departments based on chosen faculty and/or query.
 * If selectedFaculty matches known catalog items, prioritizes departments of that faculty.
 * If query doesn't match an exact department name, appends an option to use the query as custom department.
 */
export function searchDepartments(
  rawQuery: string,
  selectedFaculty?: string,
  userUniversity?: string,
): AcademicSuggestion[] {
  const query = rawQuery.trim();
  const normQuery = normalizeSearch(query);
  const facultyQuery = selectedFaculty ? normalizeSearch(selectedFaculty) : '';

  const results: AcademicSuggestion[] = [];
  const seenDepts = new Set<string>();

  // 1. First gather departments from matching faculty
  let matchingFacultyItems: FacultyCatalogItem[] = [];
  if (facultyQuery) {
    matchingFacultyItems = ACADEMIC_CATALOG.filter((item) => {
      const matchName = normalizeSearch(item.name).includes(facultyQuery);
      const isUni = !userUniversity || item.university === userUniversity;
      return matchName && isUni;
    });

    if (matchingFacultyItems.length === 0) {
      // If none for user's university, check all universities
      matchingFacultyItems = ACADEMIC_CATALOG.filter((item) =>
        normalizeSearch(item.name).includes(facultyQuery),
      );
    }
  }

  // Add departments from matching faculty
  for (const fItem of matchingFacultyItems) {
    const { badge, badgeClass } = getUniversityBadge(fItem.university);
    for (const dept of fItem.departments) {
      if (seenDepts.has(dept)) continue;
      if (normQuery && !normalizeSearch(dept).includes(normQuery)) continue;

      seenDepts.add(dept);
      results.push({
        value: dept,
        label: dept,
        badge,
        badgeClass,
        group: `ภาควิชาใน ${fItem.name}`,
      });
    }
  }

  // 2. If no faculty was selected, or if user is searching and wants to see other departments as well
  if (!selectedFaculty || results.length === 0 || normQuery) {
    // Sort catalog so user's university comes first
    const otherFacultyItems = ACADEMIC_CATALOG.filter(
      (item) => !matchingFacultyItems.includes(item),
    ).sort((a, b) => {
      if (userUniversity) {
        if (a.university === userUniversity && b.university !== userUniversity) return -1;
        if (a.university !== userUniversity && b.university === userUniversity) return 1;
      }
      return 0;
    });

    for (const fItem of otherFacultyItems) {
      const { badge, badgeClass } = getUniversityBadge(fItem.university);
      for (const dept of fItem.departments) {
        if (seenDepts.has(dept)) continue;
        if (normQuery && !normalizeSearch(dept).includes(normQuery)) continue;

        seenDepts.add(dept);
        results.push({
          value: dept,
          label: dept,
          badge,
          badgeClass,
          ...(!normQuery ? { group: fItem.name } : {}),
        });

        // Limit broad results if no query is given so list is manageable
        if (!normQuery && results.length >= 30) break;
      }
      if (!normQuery && results.length >= 30) break;
    }
  }

  // 3. If query was typed and no exact match, allow user to add their own custom department
  if (query) {
    const hasExactMatch = results.some(
      (s) => s.value.trim().toLowerCase() === query.toLowerCase(),
    );
    if (!hasExactMatch) {
      results.push({
        value: query,
        label: `➕ ใช้ "${query}" เป็นภาควิชา/สาขาวิชาของคุณ (ระบุเอง)`,
        group: 'ตัวเลือกที่คุณกำหนดเอง',
        isCustom: true,
      });
    }
  }

  return results;
}
