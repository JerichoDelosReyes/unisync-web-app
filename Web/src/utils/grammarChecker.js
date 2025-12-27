/**
 * Grammar and Spelling Checker Utility
 * 
 * Provides client-side grammar and spelling checking for announcements.
 * Catches common errors, typos, and grammar issues.
 */

// Common English words for spell checking (most frequent 1000+ words)
const COMMON_WORDS = new Set([
  // Articles, pronouns, prepositions
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'where', 'why', 'how', 'what', 'who', 'which',
  'i', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours', 'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers',
  'it', 'its', 'they', 'them', 'their', 'theirs', 'this', 'that', 'these', 'those', 'here', 'there', 'all', 'any',
  'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'also', 'now', 'even', 'still', 'already', 'always', 'never', 'often', 'sometimes',
  'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'to', 'with', 'about', 'after', 'before', 'between', 'under',
  'over', 'through', 'during', 'without', 'within', 'along', 'among', 'around', 'behind', 'below', 'beside', 'beyond',
  // Common verbs
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'go', 'goes', 'going', 'went', 'gone', 'get', 'gets', 'got', 'getting', 'make', 'makes', 'made', 'making',
  'know', 'knows', 'knew', 'known', 'knowing', 'think', 'thinks', 'thought', 'thinking', 'take', 'takes', 'took', 'taken',
  'see', 'sees', 'saw', 'seen', 'seeing', 'come', 'comes', 'came', 'coming', 'want', 'wants', 'wanted', 'wanting',
  'give', 'gives', 'gave', 'given', 'giving', 'use', 'uses', 'used', 'using', 'find', 'finds', 'found', 'finding',
  'tell', 'tells', 'told', 'telling', 'ask', 'asks', 'asked', 'asking', 'work', 'works', 'worked', 'working',
  'seem', 'seems', 'seemed', 'seeming', 'feel', 'feels', 'felt', 'feeling', 'try', 'tries', 'tried', 'trying',
  'leave', 'leaves', 'left', 'leaving', 'call', 'calls', 'called', 'calling', 'keep', 'keeps', 'kept', 'keeping',
  'let', 'lets', 'letting', 'begin', 'begins', 'began', 'begun', 'show', 'shows', 'showed', 'shown', 'showing',
  'hear', 'hears', 'heard', 'hearing', 'play', 'plays', 'played', 'playing', 'run', 'runs', 'ran', 'running',
  'move', 'moves', 'moved', 'moving', 'live', 'lives', 'lived', 'living', 'believe', 'believes', 'believed',
  'hold', 'holds', 'held', 'holding', 'bring', 'brings', 'brought', 'bringing', 'happen', 'happens', 'happened',
  'write', 'writes', 'wrote', 'written', 'writing', 'provide', 'provides', 'provided', 'providing',
  'sit', 'sits', 'sat', 'sitting', 'stand', 'stands', 'stood', 'standing', 'lose', 'loses', 'lost', 'losing',
  'pay', 'pays', 'paid', 'paying', 'meet', 'meets', 'met', 'meeting', 'include', 'includes', 'included',
  'continue', 'continues', 'continued', 'set', 'sets', 'setting', 'learn', 'learns', 'learned', 'learning',
  'change', 'changes', 'changed', 'changing', 'lead', 'leads', 'led', 'leading', 'understand', 'understands',
  'watch', 'watches', 'watched', 'watching', 'follow', 'follows', 'followed', 'following', 'stop', 'stops',
  'create', 'creates', 'created', 'creating', 'speak', 'speaks', 'spoke', 'spoken', 'speaking', 'read', 'reads',
  'spend', 'spends', 'spent', 'spending', 'grow', 'grows', 'grew', 'grown', 'growing', 'open', 'opens', 'opened',
  'walk', 'walks', 'walked', 'walking', 'win', 'wins', 'won', 'winning', 'offer', 'offers', 'offered', 'offering',
  'remember', 'remembers', 'remembered', 'consider', 'considers', 'considered', 'appear', 'appears', 'appeared',
  'buy', 'buys', 'bought', 'buying', 'wait', 'waits', 'waited', 'waiting', 'serve', 'serves', 'served', 'serving',
  'die', 'dies', 'died', 'dying', 'send', 'sends', 'sent', 'sending', 'expect', 'expects', 'expected', 'expecting',
  'build', 'builds', 'built', 'building', 'stay', 'stays', 'stayed', 'staying', 'fall', 'falls', 'fell', 'fallen',
  'cut', 'cuts', 'cutting', 'reach', 'reaches', 'reached', 'reaching', 'kill', 'kills', 'killed', 'killing',
  'remain', 'remains', 'remained', 'suggest', 'suggests', 'suggested', 'raise', 'raises', 'raised', 'raising',
  'pass', 'passes', 'passed', 'passing', 'sell', 'sells', 'sold', 'selling', 'require', 'requires', 'required',
  'report', 'reports', 'reported', 'decide', 'decides', 'decided', 'pull', 'pulls', 'pulled', 'pulling',
  // Common nouns
  'time', 'year', 'people', 'way', 'day', 'man', 'woman', 'child', 'children', 'world', 'life', 'hand', 'part',
  'place', 'case', 'week', 'company', 'system', 'program', 'question', 'work', 'government', 'number', 'night',
  'point', 'home', 'water', 'room', 'mother', 'area', 'money', 'story', 'fact', 'month', 'lot', 'right', 'study',
  'book', 'eye', 'job', 'word', 'business', 'issue', 'side', 'kind', 'head', 'house', 'service', 'friend', 'father',
  'power', 'hour', 'game', 'line', 'end', 'member', 'law', 'car', 'city', 'community', 'name', 'president', 'team',
  'minute', 'idea', 'kid', 'body', 'information', 'back', 'parent', 'face', 'others', 'level', 'office', 'door',
  'health', 'person', 'art', 'war', 'history', 'party', 'result', 'change', 'morning', 'reason', 'research', 'girl',
  'guy', 'moment', 'air', 'teacher', 'force', 'education', 'student', 'students', 'class', 'classes', 'school',
  'university', 'college', 'campus', 'semester', 'course', 'courses', 'subject', 'subjects', 'exam', 'exams',
  'test', 'tests', 'grade', 'grades', 'professor', 'lecture', 'assignment', 'project', 'deadline', 'schedule',
  'announcement', 'announcements', 'event', 'events', 'meeting', 'meetings', 'activity', 'activities',
  'organization', 'department', 'faculty', 'staff', 'admin', 'office', 'room', 'building', 'library',
  // Common adjectives
  'good', 'new', 'first', 'last', 'long', 'great', 'little', 'own', 'other', 'old', 'right', 'big', 'high', 'small',
  'large', 'next', 'early', 'young', 'important', 'few', 'public', 'bad', 'same', 'able', 'human', 'local', 'sure',
  'free', 'better', 'best', 'true', 'full', 'special', 'easy', 'clear', 'recent', 'certain', 'personal', 'open',
  'red', 'black', 'white', 'blue', 'green', 'strong', 'possible', 'whole', 'real', 'available', 'different',
  'happy', 'sorry', 'nice', 'hard', 'late', 'past', 'close', 'common', 'low', 'short', 'natural', 'significant',
  // Common adverbs
  'up', 'out', 'down', 'off', 'well', 'back', 'away', 'really', 'again', 'once', 'later', 'never', 'today',
  'together', 'please', 'thank', 'thanks', 'okay', 'yes', 'no', 'maybe', 'however', 'therefore', 'though',
  // Days, months, common proper nouns
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  // Numbers as words
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'hundred', 'thousand',
  // Action words common in announcements
  'join', 'attend', 'register', 'sign', 'submit', 'complete', 'participate', 'visit', 'check', 'contact',
  'email', 'call', 'notify', 'inform', 'update', 'share', 'post', 'upload', 'download', 'view', 'click',
  'confirm', 'cancel', 'reschedule', 'postpone', 'extend', 'remind', 'reminder', 'note', 'notice', 'attention',
  'details', 'detail', 'regarding', 'concerning', 'subject', 'topic', 'agenda', 'venue', 'date', 'dates'
])

// Common Filipino/Tagalog words for spell checking
const FILIPINO_WORDS = new Set([
  // Pronouns
  'ako', 'ikaw', 'ka', 'siya', 'kami', 'tayo', 'kayo', 'sila', 'niya', 'nila', 'natin', 'namin', 'ninyo',
  'ko', 'mo', 'nito', 'niyan', 'niyon', 'akin', 'iyo', 'atin', 'amin', 'inyo', 'kanila', 'kanya',
  'ito', 'iyan', 'iyon', 'dito', 'diyan', 'doon', 'rito', 'riyan', 'roon', 'sino', 'ano', 'alin',
  // Linkers and particles (very common short words)
  'sa', 'si', 'ni', 'ng', 'kay', 'kina', 'nina', 'ang', 'mga', 'na', 'pa', 'at', 'o', 'ay',
  'kong', 'mong', 'nang', 'kung', 'pang', 'sang',
  // Common verbs
  'magpunta', 'pumunta', 'punta', 'pupunta', 'pumupunta', 'gumawa', 'gagawa', 'gumagawa', 'gawa',
  'kumain', 'kakain', 'kumakain', 'kain', 'uminom', 'iinom', 'umiinom', 'inom',
  'maglaro', 'naglaro', 'naglalaro', 'maglalaro', 'laro', 'magtrabaho', 'nagtrabaho', 'nagtatrabaho',
  'magbasa', 'nagbasa', 'nagbabasa', 'magbabasa', 'basa', 'magsulat', 'nagsulat', 'nagsusulat',
  'makinig', 'nakinig', 'nakikinig', 'makikinig', 'kinig', 'magsalita', 'nagsalita', 'nagsasalita',
  'dumating', 'darating', 'dumarating', 'dating', 'umalis', 'aalis', 'umaalis', 'alis',
  'bumili', 'bibili', 'bumibili', 'bili', 'magbenta', 'nagbenta', 'nagbebenta', 'benta',
  'magluto', 'nagluto', 'nagluluto', 'magluluto', 'luto', 'maglinis', 'naglinis', 'naglilinis',
  'maghugas', 'naghugas', 'naghuhugas', 'hugas', 'matulog', 'natulog', 'natutulog', 'matutulog', 'tulog',
  'gumising', 'gigising', 'gumigising', 'gising', 'umuwi', 'uuwi', 'umuuwi', 'uwi',
  'sumama', 'sasama', 'sumasama', 'sama', 'tumulong', 'tutulong', 'tumutulong', 'tulong',
  'magbigay', 'nagbigay', 'nagbibigay', 'bigay', 'kumuha', 'kukuha', 'kumukuha', 'kuha',
  'magtanong', 'nagtanong', 'nagtatanong', 'tanong', 'sumagot', 'sasagot', 'sumasagot', 'sagot',
  'magpasalamat', 'nagpasalamat', 'nagpapasalamat', 'pasalamat', 'salamat',
  'magpatawad', 'nagpatawad', 'nagpapatawad', 'patawad', 'tawad',
  'huwag', 'wag', 'dapat', 'kailangan', 'gusto', 'ayaw', 'maaari', 'pwede', 'puwede',
  // Common nouns
  'tao', 'mga', 'araw', 'gabi', 'umaga', 'hapon', 'tanghali', 'oras', 'minuto', 'segundo',
  'linggo', 'buwan', 'taon', 'panahon', 'lugar', 'bahay', 'paaralan', 'eskwela', 'eskuwelahan',
  'trabaho', 'opisina', 'gusali', 'silid', 'kwarto', 'klase', 'estudyante', 'guro', 'titser',
  'kaibigan', 'pamilya', 'magulang', 'ama', 'ina', 'tatay', 'nanay', 'lolo', 'lola',
  'anak', 'kapatid', 'kuya', 'ate', 'bunso', 'pangalan', 'edad', 'tirahan', 'address',
  'pagkain', 'tubig', 'kape', 'tsaa', 'gatas', 'tinapay', 'kanin', 'ulam', 'prutas', 'gulay',
  'libro', 'papel', 'lapis', 'bolpen', 'kuwaderno', 'bag', 'cellphone', 'telepono', 'kompyuter',
  'kotse', 'bus', 'jeep', 'jeepney', 'tricycle', 'traysikel', 'motorsiklo', 'bisikleta',
  'pera', 'salapi', 'presyo', 'bayad', 'suweldo', 'sahod', 'gastos', 'ipon', 'utang',
  'balita', 'pahayagan', 'anunsyo', 'paunawa', 'abiso', 'mensahe', 'sulat', 'liham',
  'pulong', 'miting', 'programa', 'aktibidad', 'gawain', 'proyekto', 'eksamen', 'pagsusulit',
  'iskedyul', 'palatuntunan', 'okasyon', 'selebrasyon', 'kasiyahan', 'kaganapan',
  // Common adjectives
  'maganda', 'pangit', 'mabuti', 'masama', 'malaki', 'maliit', 'mahaba', 'maikli',
  'matangkad', 'mababa', 'mataas', 'mabilis', 'mabagal', 'malamig', 'mainit', 'malambot', 'matigas',
  'matamis', 'maalat', 'maasim', 'mapait', 'maanghang', 'masarap', 'malasa',
  'malinis', 'marumi', 'maliwanag', 'madilim', 'tahimik', 'maingay', 'malayo', 'malapit',
  'bago', 'luma', 'bata', 'matanda', 'payat', 'mataba', 'masaya', 'malungkot', 'galit',
  'takot', 'gutom', 'busog', 'uhaw', 'pagod', 'antok', 'handa', 'abala', 'libre',
  'mahal', 'mura', 'madali', 'mahirap', 'simple', 'kumplikado', 'totoo', 'peke',
  // Common adverbs and particles
  'na', 'pa', 'lang', 'lamang', 'din', 'rin', 'man', 'naman', 'nga', 'po', 'ho',
  'oo', 'hindi', 'di', 'opo', 'oho', 'sige', 'teka', 'sandali', 'mamaya', 'kanina', 'kahapon',
  'bukas', 'ngayon', 'kailan', 'paano', 'bakit', 'saan', 'nasaan', 'gaano',
  'madalas', 'palagi', 'lagi', 'minsan', 'paminsan', 'kaunti', 'marami', 'lahat', 'wala',
  'may', 'mayroon', 'meron', 'kasi', 'dahil', 'sapagkat', 'para', 'upang', 'hanggang',
  'bago', 'pagkatapos', 'habang', 'kapag', 'kung', 'kahit', 'pero', 'ngunit', 'subalit',
  'daw', 'raw', 'pala', 'yata', 'ata', 'kaya', 'sana', 'tuloy', 'muna', 'ulit',
  'ayaw', 'ayoko', 'ayos', 'ba', 'e', 'eh', 'o', 'tapos', 'tas', 'tsaka', 'pati',
  'yung', 'yun', 'yon', 'itong', 'iyang', 'iyong', 'dine', 'nandito', 'nandyan', 'nandoon',
  // Common expressions
  'kamusta', 'kumusta', 'salamat', 'maraming', 'pasensya', 'paumanhin', 'sorry', 'sori',
  'ingat', 'paalam', 'babay', 'bye', 'magandang', 'maligayang', 'bati', 'pagbati',
  // Days of the week (Filipino)
  'lunes', 'martes', 'miyerkules', 'miyerkoles', 'huwebes', 'biyernes', 'sabado', 'linggo',
  // Months (Filipino)
  'enero', 'pebrero', 'marso', 'abril', 'mayo', 'hunyo', 'hulyo', 'agosto', 'setyembre', 'oktubre', 'nobyembre', 'disyembre',
  // Numbers (Filipino)
  'isa', 'dalawa', 'tatlo', 'apat', 'lima', 'anim', 'pito', 'walo', 'siyam', 'sampu',
  'labing', 'labinisa', 'labingdalawa', 'dalawampu', 'tatlumpu', 'apatnapu', 'limampu',
  'animnapu', 'pitumpu', 'walumpu', 'siyamnapu', 'sandaan', 'isanlibo'
])

// Common Filipino misspellings (misspelled: correct)
const FILIPINO_MISSPELLINGS = {
  // Common typos and errors (text speak to formal)
  'nman': 'naman',
  'nmn': 'naman',
  'kc': 'kasi',
  'kse': 'kasi',
  'kci': 'kasi',
  'dn': 'din',
  'rn': 'rin',
  'poh': 'po',
  'pow': 'po',
  'nyo': 'ninyo',
  'ntin': 'natin',
  'nmin': 'namin',
  'aq': 'ako',
  'aqo': 'ako',
  'cya': 'siya',
  'xa': 'siya',
  'cla': 'sila',
  'xla': 'sila',
  'cnu': 'sino',
  'xno': 'sino',
  'cno': 'sino',
  'anu': 'ano',
  'anoh': 'ano',
  'bkit': 'bakit',
  'bket': 'bakit',
  'ggwin': 'gagawin',
  'pgkain': 'pagkain',
  'pra': 'para',
  'praa': 'para',
  'sau': 'sa iyo',
  'sayu': 'sa iyo',
  'sayo': 'sa iyo',
  'kau': 'kayo',
  'kyuh': 'kayo',
  'tpos': 'tapos',
  'tps': 'tapos',
  'tpus': 'tapos',
  'lng': 'lang',
  'lngg': 'lang',
  'cguro': 'siguro',
  'cgro': 'siguro',
  'sguro': 'siguro',
  'mganda': 'maganda',
  'gnda': 'ganda',
  'mhal': 'mahal',
  'mhl': 'mahal',
  'slmat': 'salamat',
  'slmt': 'salamat',
  'tnx': 'salamat',
  'ty': 'salamat',
  'thnks': 'salamat',
  'gud': 'good',
  'gd': 'good',
  'nid': 'need',
  'nd': 'and',
  'dis': 'this',
  'dat': 'that',
  'dto': 'dito',
  'dyan': 'diyan',
  'dun': 'doon',
  'jan': 'diyan',
  'dne': 'dine',
  'gsto': 'gusto',
  'gstu': 'gusto',
  'gustu': 'gusto',
  'ayku': 'ayoko',
  'ayq': 'ayoko',
  'bsta': 'basta',
  'pro': 'pero',
  'proh': 'pero',
  'hnd': 'hindi',
  'hinde': 'hindi',
  'hndih': 'hindi',
  'hndi': 'hindi',
  'ndi': 'hindi',
  'wla': 'wala',
  'wlah': 'wala',
  'mrami': 'marami',
  'mdami': 'madami',
  'konte': 'konti',
  'knti': 'konti',
  'mna': 'muna',
  'mnya': 'mamaya',
  'mmya': 'mamaya',
  'mmaya': 'mamaya',
  'sge': 'sige',
  'cge': 'sige',
  'cgie': 'sige',
  'opoh': 'opo',
  'opow': 'opo',
  'opu': 'opo',
  'ingts': 'ingat',
  'engt': 'ingat',
  'engat': 'ingat',
  'tska': 'tsaka',
  'tas': 'tapos',
  'bah': 'ba',
  'nba': 'na ba',
  'ung': 'yung',
  'yng': 'yung',
  'yny': 'yung',
  'un': 'yun',
  'yn': 'yun',
  'yun': 'iyon',
  'yung': 'iyong'
}

// Common misspellings dictionary (misspelled: correct)
const COMMON_MISSPELLINGS = {
  // Common typos
  'teh': 'the',
  'hte': 'the',
  'taht': 'that',
  'adn': 'and',
  'nad': 'and',
  'fo': 'of',
  'ot': 'to',
  'tot': 'to',
  'si': 'is',
  'ti': 'it',
  'nto': 'not',
  'tno': 'not',
  'yuo': 'you',
  'yuor': 'your',
  'thier': 'their',
  'wiht': 'with',
  'whit': 'with',
  'fro': 'for',
  'frome': 'from',
  'jsut': 'just',
  'jstu': 'just',
  'ont': 'not',
  'ont': 'on',
  'nwo': 'now',
  'konw': 'know',
  'knwo': 'know',
  'hwo': 'how',
  'waht': 'what',
  'hwat': 'what',
  'wehn': 'when',
  'wehre': 'where',
  'whcih': 'which',
  'beacuse': 'because',
  'becuase': 'because',
  'becasue': 'because',
  'recieve': 'receive',
  'reciept': 'receipt',
  'seperate': 'separate',
  'occured': 'occurred',
  'occurence': 'occurrence',
  'definately': 'definitely',
  'definatly': 'definitely',
  'goverment': 'government',
  'enviroment': 'environment',
  'untill': 'until',
  'tommorrow': 'tomorrow',
  'tommorow': 'tomorrow',
  'tomarrow': 'tomorrow',
  'calender': 'calendar',
  'accomodate': 'accommodate',
  'acheive': 'achieve',
  'accross': 'across',
  'agressive': 'aggressive',
  'apparantly': 'apparently',
  'arguement': 'argument',
  'begining': 'beginning',
  'beleive': 'believe',
  'buisness': 'business',
  'catagory': 'category',
  'cemetary': 'cemetery',
  'changable': 'changeable',
  'collegue': 'colleague',
  'comming': 'coming',
  'commited': 'committed',
  'concious': 'conscious',
  'curiousity': 'curiosity',
  'embarass': 'embarrass',
  'existance': 'existence',
  'experiance': 'experience',
  'foriegn': 'foreign',
  'gauruntee': 'guarantee',
  'happend': 'happened',
  'harrass': 'harass',
  'immediatly': 'immediately',
  'independant': 'independent',
  'inteligent': 'intelligent',
  'intresting': 'interesting',
  'knowlege': 'knowledge',
  'liason': 'liaison',
  'manuever': 'maneuver',
  'millenium': 'millennium',
  'miniscule': 'minuscule',
  'mispell': 'misspell',
  'neccessary': 'necessary',
  'noticable': 'noticeable',
  'occassion': 'occasion',
  'pastime': 'pastime',
  'perseverence': 'perseverance',
  'playwrite': 'playwright',
  'posession': 'possession',
  'potatos': 'potatoes',
  'preceed': 'precede',
  'privelege': 'privilege',
  'professer': 'professor',
  'publically': 'publicly',
  'quarentine': 'quarantine',
  'questionaire': 'questionnaire',
  'recomend': 'recommend',
  'reffered': 'referred',
  'relevent': 'relevant',
  'rythm': 'rhythm',
  'sieze': 'seize',
  'speach': 'speech',
  'supercede': 'supersede',
  'suprise': 'surprise',
  'tomatos': 'tomatoes',
  'truely': 'truly',
  'vaccuum': 'vacuum',
  'wierd': 'weird',
  'writting': 'writing',
  
  // Filipino-English common errors
  'ur': 'your',
  'u': 'you',
  'r': 'are',
  'pls': 'please',
  'plz': 'please',
  'thru': 'through',
  'coz': 'because',
  'bcoz': 'because',
  'bcuz': 'because',
  'gud': 'good',
  'dat': 'that',
  'dis': 'this',
  'wat': 'what',
  'wer': 'were',
  'wen': 'when',
  'wud': 'would',
  'shud': 'should',
  'cud': 'could',
  'gonna': 'going to',
  'wanna': 'want to',
  'gotta': 'got to',
  'kinda': 'kind of',
  'dunno': 'don\'t know',
  'prolly': 'probably',
  'shouldnt': 'shouldn\'t',
  'couldnt': 'couldn\'t',
  'wouldnt': 'wouldn\'t',
  'dont': 'don\'t',
  'cant': 'can\'t',
  'wont': 'won\'t',
  'didnt': 'didn\'t',
  'doesnt': 'doesn\'t',
  'hasnt': 'hasn\'t',
  'hadnt': 'hadn\'t',
  'isnt': 'isn\'t',
  'wasnt': 'wasn\'t',
  'werent': 'weren\'t',
  'arent': 'aren\'t',
  'aint': 'isn\'t',
  'im': 'I\'m',
  'ive': 'I\'ve',
  'id': 'I\'d',
  'ill': 'I\'ll',
  'youre': 'you\'re',
  'youve': 'you\'ve',
  'youd': 'you\'d',
  'youll': 'you\'ll',
  'theyre': 'they\'re',
  'theyve': 'they\'ve',
  'theyd': 'they\'d',
  'theyll': 'they\'ll',
  'weve': 'we\'ve',
  'wed': 'we\'d',
  'well': 'we\'ll',
  'hes': 'he\'s',
  'shes': 'she\'s',
  'its': 'it\'s', // Note: context-dependent
  'thats': 'that\'s',
  'whats': 'what\'s',
  'whos': 'who\'s',
  'heres': 'here\'s',
  'theres': 'there\'s',
  'wheres': 'where\'s'
}

// Grammar patterns to check
const GRAMMAR_PATTERNS = [
  // Double words
  {
    pattern: /\b(\w+)\s+\1\b/gi,
    message: 'Repeated word detected',
    type: 'repetition',
    severity: 'warning'
  },
  // Double articles/determiners (e.g., "the your", "a the", "the the")
  {
    pattern: /\b(the|a|an)\s+(the|a|an|your|my|his|her|its|our|their)\b/gi,
    message: 'Double article/determiner detected - remove one',
    type: 'grammar',
    severity: 'error'
  },
  // Determiner before another determiner
  {
    pattern: /\b(your|my|his|her|its|our|their)\s+(the|a|an|your|my|his|her|its|our|their)\b/gi,
    message: 'Double determiner detected - remove one',
    type: 'grammar',
    severity: 'error'
  },
  // Missing space after punctuation
  {
    pattern: /[.!?](?=[A-Z])/g,
    message: 'Missing space after punctuation',
    type: 'punctuation',
    severity: 'suggestion'
  },
  // Multiple spaces
  {
    pattern: /\s{2,}/g,
    message: 'Multiple consecutive spaces',
    type: 'spacing',
    severity: 'suggestion'
  },
  // Sentence starting with lowercase (after period)
  {
    pattern: /\.\s+[a-z]/g,
    message: 'Sentence should start with uppercase letter',
    type: 'capitalization',
    severity: 'warning'
  },
  // Missing period at end
  {
    pattern: /[a-zA-Z]$/,
    message: 'Missing punctuation at end of text',
    type: 'punctuation',
    severity: 'suggestion',
    endOfText: true
  },
  // Common grammar mistakes
  {
    pattern: /\bshould of\b/gi,
    message: '"should of" should be "should have"',
    type: 'grammar',
    severity: 'error',
    suggestion: 'should have'
  },
  {
    pattern: /\bcould of\b/gi,
    message: '"could of" should be "could have"',
    type: 'grammar',
    severity: 'error',
    suggestion: 'could have'
  },
  {
    pattern: /\bwould of\b/gi,
    message: '"would of" should be "would have"',
    type: 'grammar',
    severity: 'error',
    suggestion: 'would have'
  },
  {
    pattern: /\bmight of\b/gi,
    message: '"might of" should be "might have"',
    type: 'grammar',
    severity: 'error',
    suggestion: 'might have'
  },
  {
    pattern: /\bmust of\b/gi,
    message: '"must of" should be "must have"',
    type: 'grammar',
    severity: 'error',
    suggestion: 'must have'
  },
  // Their/there/they're confusion
  {
    pattern: /\btheir\s+(is|are|was|were|will|would|could|should)\b/gi,
    message: '"their" might be "there" in this context',
    type: 'grammar',
    severity: 'warning'
  },
  // You/your confusion - "you" before a noun should be "your"
  {
    pattern: /\byou\s+(share|name|email|phone|address|account|password|profile|photo|picture|file|document|report|assignment|project|schedule|class|classes|course|courses|grade|grades|team|group|department|office|request|application|submission|announcement|message|post|comment|feedback|review|opinion|idea|question|answer|response|choice|decision|preference|permission|access|role|status|information|data|details|settings|options)\b/gi,
    message: '"you" should be "your" before a noun',
    type: 'grammar',
    severity: 'error',
    suggestion: 'your'
  },
  // Dangling contractions at end of sentence/text
  {
    pattern: /\b(you're|we're|they're|i'm|he's|she's|it's|that's|there's|here's|what's|who's|how's|where's|when's|isn't|aren't|wasn't|weren't|don't|doesn't|didn't|won't|wouldn't|couldn't|shouldn't|can't|haven't|hasn't|hadn't)\s*[.!?,;]?\s*$/gi,
    message: 'Sentence appears incomplete - contraction at end without following word',
    type: 'grammar',
    severity: 'warning'
  },
  // Your/you're confusion
  {
    pattern: /\byour\s+(welcome|right|wrong|correct|going|coming)\b/gi,
    message: '"your" might be "you\'re" in this context',
    type: 'grammar',
    severity: 'warning'
  },
  // Its/it's confusion
  {
    pattern: /\bits\s+(a|an|the|going|been|not|very|really)\b/gi,
    message: '"its" might be "it\'s" in this context',
    type: 'grammar',
    severity: 'warning'
  },
  // Affect/effect confusion
  {
    pattern: /\bthe affect\b/gi,
    message: '"affect" might be "effect" (noun form)',
    type: 'grammar',
    severity: 'warning'
  },
  // Then/than confusion
  {
    pattern: /\b(more|less|better|worse|greater|smaller|bigger|larger|higher|lower)\s+then\b/gi,
    message: '"then" should be "than" for comparisons',
    type: 'grammar',
    severity: 'error',
    suggestion: 'than'
  },
  // A vs An
  {
    pattern: /\ba\s+[aeiouAEIOU]\w+/g,
    message: 'Consider using "an" before words starting with a vowel sound',
    type: 'grammar',
    severity: 'suggestion'
  },
  {
    pattern: /\ban\s+[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]\w+/g,
    message: 'Consider using "a" before words starting with a consonant sound',
    type: 'grammar',
    severity: 'suggestion'
  },
  // Subject-verb agreement
  {
    pattern: /\beveryone\s+(are|were|have)\b/gi,
    message: '"everyone" takes singular verb (is/was/has)',
    type: 'grammar',
    severity: 'error'
  },
  {
    pattern: /\beverybody\s+(are|were|have)\b/gi,
    message: '"everybody" takes singular verb (is/was/has)',
    type: 'grammar',
    severity: 'error'
  },
  {
    pattern: /\bsomeone\s+(are|were|have)\b/gi,
    message: '"someone" takes singular verb (is/was/has)',
    type: 'grammar',
    severity: 'error'
  },
  {
    pattern: /\bnobody\s+(are|were|have)\b/gi,
    message: '"nobody" takes singular verb (is/was/has)',
    type: 'grammar',
    severity: 'error'
  },
  // Run-on sentences (very long without punctuation)
  {
    pattern: /^[^.!?]{200,}/,
    message: 'Very long sentence - consider breaking into smaller sentences',
    type: 'readability',
    severity: 'suggestion'
  }
]

// Filipino/Tagalog grammar patterns
const FILIPINO_GRAMMAR_PATTERNS = [
  // Double linkers (na na, ng ng)
  {
    pattern: /\b(na)\s+(na)\b/gi,
    message: 'Paulit-ulit na linker "na na" - alisin ang isa',
    type: 'grammar',
    severity: 'error'
  },
  {
    pattern: /\b(ng)\s+(ng)\b/gi,
    message: 'Paulit-ulit na linker "ng ng" - alisin ang isa',
    type: 'grammar',
    severity: 'error'
  },
  // Common Filipino grammar mistakes
  {
    pattern: /\bako ay\b/gi,
    message: '"ako ay" - mas natural ang "ako\'y" o baguhin ang pangungusap',
    type: 'grammar',
    severity: 'suggestion'
  },
  {
    pattern: /\bsiya ay\b/gi,
    message: '"siya ay" - mas natural ang "siya\'y" o baguhin ang pangungusap',
    type: 'grammar',
    severity: 'suggestion'
  },
  // Missing "ng" marker
  {
    pattern: /\b(gusto|ayaw|kailangan|dapat)\s+(ako|ikaw|siya|kami|tayo|kayo|sila)\b/gi,
    message: 'Dapat may "ng" pagkatapos - halimbawa: "gusto kong"',
    type: 'grammar',
    severity: 'warning'
  },
  // "po" placement
  {
    pattern: /\bpo\s+po\b/gi,
    message: 'Paulit-ulit na "po" - isa lang ang kailangan',
    type: 'grammar',
    severity: 'warning'
  },
  // Common Taglish errors
  {
    pattern: /\bi am\s+(ako|siya|kami|tayo|kayo|sila)\b/gi,
    message: 'Halo-halong wika - piliin ang English o Filipino',
    type: 'grammar',
    severity: 'suggestion'
  },
  // "Ang" before verbs (should be "Ang pag-")
  {
    pattern: /\bang\s+(kumain|uminom|maglaro|magtrabaho|magbasa|magsulat)\b/gi,
    message: 'Dapat "ang pag-" bago ang pandiwa',
    type: 'grammar',
    severity: 'warning'
  },
  // Double "mga"
  {
    pattern: /\bmga\s+mga\b/gi,
    message: 'Paulit-ulit na "mga" - alisin ang isa',
    type: 'grammar',
    severity: 'error'
  },
  // Text speak in formal announcements
  {
    pattern: /\b(poh|pow|opow|opoh|cguro|cge|cya|xa|nman|nmn|kc|lng)\b/gi,
    message: 'Tekstong pang-chat - gamitin ang tamang baybay para sa pormal na anunsyo',
    type: 'spelling',
    severity: 'warning'
  }
]

// Severity weights for scoring
const SEVERITY_WEIGHTS = {
  error: 3,
  warning: 2,
  suggestion: 1
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Edit distance
 */
const levenshteinDistance = (a, b) => {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Find closest word suggestion using Levenshtein distance
 * @param {string} word - Misspelled word
 * @returns {string|null} Suggested correction or null
 */
const findClosestWord = (word) => {
  const lowerWord = word.toLowerCase()
  let bestMatch = null
  let bestDistance = Infinity
  
  // Only check words of similar length (±2 characters)
  const minLen = Math.max(2, lowerWord.length - 2)
  const maxLen = lowerWord.length + 2
  
  for (const dictWord of COMMON_WORDS) {
    if (dictWord.length < minLen || dictWord.length > maxLen) continue
    
    const distance = levenshteinDistance(lowerWord, dictWord)
    
    // Accept if distance is <= 2 for short words, <= 3 for longer words
    const maxAcceptableDistance = lowerWord.length <= 4 ? 2 : 3
    
    if (distance < bestDistance && distance <= maxAcceptableDistance) {
      bestDistance = distance
      bestMatch = dictWord
    }
  }
  
  return bestMatch
}

/**
 * Find closest Filipino word suggestion using Levenshtein distance
 * @param {string} word - Misspelled word
 * @returns {string|null} Suggested correction or null
 */
const findClosestFilipinoWord = (word) => {
  const lowerWord = word.toLowerCase()
  let bestMatch = null
  let bestDistance = Infinity
  
  // Only check words of similar length (±2 characters)
  const minLen = Math.max(2, lowerWord.length - 2)
  const maxLen = lowerWord.length + 2
  
  for (const dictWord of FILIPINO_WORDS) {
    if (dictWord.length < minLen || dictWord.length > maxLen) continue
    
    const distance = levenshteinDistance(lowerWord, dictWord)
    
    // Accept if distance is <= 2 for short words, <= 3 for longer words
    const maxAcceptableDistance = lowerWord.length <= 4 ? 2 : 3
    
    if (distance < bestDistance && distance <= maxAcceptableDistance) {
      bestDistance = distance
      bestMatch = dictWord
    }
  }
  
  return bestMatch
}

/**
 * Check if a word looks like valid English (basic heuristics)
 * @param {string} word - Word to check
 * @returns {boolean} True if word looks valid
 */
const looksLikeEnglishWord = (word) => {
  if (!word || word.length < 2) return true
  
  const lower = word.toLowerCase()
  
  // Check for impossible letter combinations
  const impossiblePatterns = [
    /^[^aeiouy]+$/, // No vowels at all (for words > 3 chars)
    /(.)\1{2,}/, // Triple or more repeated letters
    /[qwx]{2,}/, // Multiple hard consonants in a row
    /[^aeiou]{5,}/, // 5+ consonants in a row
    /[aeiou]{4,}/, // 4+ vowels in a row
    /^[^aeiou]{4,}/, // Starts with 4+ consonants
    /[jqxz]{2,}/, // Multiple rare consonants
  ]
  
  // Only apply "no vowels" check for longer words
  if (lower.length > 3 && impossiblePatterns[0].test(lower)) {
    return false
  }
  
  // Check other patterns
  for (let i = 1; i < impossiblePatterns.length; i++) {
    if (impossiblePatterns[i].test(lower)) {
      return false
    }
  }
  
  return true
}

/**
 * Check if a word looks like valid Filipino/Tagalog (basic heuristics)
 * @param {string} word - Word to check
 * @returns {boolean} True if word looks valid
 */
const looksLikeFilipinoWord = (word) => {
  if (!word || word.length < 2) return true
  
  const lower = word.toLowerCase()
  
  // Filipino uses a, e, i, o, u as vowels (similar to English)
  // Common Filipino letter patterns
  const impossiblePatterns = [
    /^[^aeiouy]+$/, // No vowels at all (for words > 3 chars)
    /(.)\1{3,}/, // 4+ repeated letters (Filipino can have double letters like "aa")
    /[qxz]{2,}/, // Multiple rare consonants (q, x, z are rare in Filipino)
    /[^aeiou]{6,}/, // 6+ consonants in a row (Filipino allows more consonant clusters)
  ]
  
  // Only apply "no vowels" check for longer words
  if (lower.length > 4 && impossiblePatterns[0].test(lower)) {
    return false
  }
  
  // Check other patterns
  for (let i = 1; i < impossiblePatterns.length; i++) {
    if (impossiblePatterns[i].test(lower)) {
      return false
    }
  }
  
  return true
}

/**
 * Check text for spelling errors (supports English and Filipino)
 * @param {string} text - Text to check
 * @returns {Array} Array of spelling issues found
 */
export const checkSpelling = (text) => {
  const issues = []
  const words = text.split(/\s+/)
  
  words.forEach((word, index) => {
    // Clean word of punctuation for checking
    const cleanWord = word.toLowerCase().replace(/[^a-z'ñ]/g, '')
    
    // Skip empty, very short words, or words with numbers
    if (!cleanWord || cleanWord.length < 2) return
    
    // Skip words that are all caps (likely acronyms)
    if (word === word.toUpperCase() && word.length > 1) return
    
    // Skip words with apostrophes (contractions handled separately)
    if (cleanWord.includes("'")) return
    
    // 1. First check Filipino misspellings dictionary
    if (FILIPINO_MISSPELLINGS[cleanWord]) {
      issues.push({
        type: 'spelling',
        severity: 'warning',
        word: word,
        suggestion: FILIPINO_MISSPELLINGS[cleanWord],
        message: `"${word}" - dapat "${FILIPINO_MISSPELLINGS[cleanWord]}" ang tamang baybay`,
        position: index
      })
      return
    }
    
    // 2. Check English misspellings dictionary
    if (COMMON_MISSPELLINGS[cleanWord]) {
      issues.push({
        type: 'spelling',
        severity: 'error',
        word: word,
        suggestion: COMMON_MISSPELLINGS[cleanWord],
        message: `"${word}" might be misspelled. Did you mean "${COMMON_MISSPELLINGS[cleanWord]}"?`,
        position: index
      })
      return
    }
    
    // 3. Check if word is in our common words list (English or Filipino)
    if (COMMON_WORDS.has(cleanWord) || FILIPINO_WORDS.has(cleanWord)) {
      return // Word is valid
    }
    
    // 4. Check if word looks like a scrambled/impossible word
    if (!looksLikeEnglishWord(cleanWord) && !looksLikeFilipinoWord(cleanWord)) {
      const suggestion = findClosestWord(cleanWord)
      issues.push({
        type: 'spelling',
        severity: 'error',
        word: word,
        suggestion: suggestion,
        message: suggestion 
          ? `"${word}" appears misspelled. Did you mean "${suggestion}"?`
          : `"${word}" doesn't appear to be a valid word.`,
        position: index
      })
      return
    }
    
    // 5. For unknown words not in dictionary, try to find a close match
    const closestEnglish = findClosestWord(cleanWord)
    const closestFilipino = findClosestFilipinoWord(cleanWord)
    
    // Pick the closest match between English and Filipino
    let closestMatch = null
    let closestDistance = Infinity
    
    if (closestEnglish) {
      const dist = levenshteinDistance(cleanWord, closestEnglish)
      if (dist < closestDistance) {
        closestDistance = dist
        closestMatch = closestEnglish
      }
    }
    
    if (closestFilipino) {
      const dist = levenshteinDistance(cleanWord, closestFilipino)
      if (dist < closestDistance) {
        closestDistance = dist
        closestMatch = closestFilipino
      }
    }
    
    if (closestMatch && closestDistance <= 2) {
      // It's close to a known word but not exact - likely a typo
      issues.push({
        type: 'spelling',
        severity: 'warning',
        word: word,
        suggestion: closestMatch,
        message: `"${word}" might be misspelled. Did you mean "${closestMatch}"?`,
        position: index
      })
    }
  })
  
  return issues
}

/**
 * Check text for grammar issues (English and Filipino)
 * @param {string} text - Text to check
 * @returns {Array} Array of grammar issues found
 */
export const checkGrammar = (text) => {
  const issues = []
  
  // Check English grammar patterns
  GRAMMAR_PATTERNS.forEach(({ pattern, message, type, severity, suggestion, endOfText }) => {
    // Skip end-of-text patterns for now, handle separately
    if (endOfText) {
      if (pattern.test(text.trim())) {
        issues.push({
          type,
          severity,
          message,
          suggestion
        })
      }
      return
    }
    
    const matches = text.match(pattern)
    if (matches) {
      matches.forEach(match => {
        issues.push({
          type,
          severity,
          word: match,
          message,
          suggestion
        })
      })
    }
  })
  
  // Check Filipino grammar patterns
  FILIPINO_GRAMMAR_PATTERNS.forEach(({ pattern, message, type, severity, suggestion }) => {
    const matches = text.match(pattern)
    if (matches) {
      matches.forEach(match => {
        issues.push({
          type,
          severity,
          word: match,
          message,
          suggestion,
          language: 'filipino'
        })
      })
    }
  })
  
  return issues
}

/**
 * Calculate readability score (simplified Flesch-Kincaid)
 * @param {string} text - Text to analyze
 * @returns {Object} Readability metrics
 */
export const calculateReadability = (text) => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const words = text.split(/\s+/).filter(w => w.trim().length > 0)
  const syllables = words.reduce((count, word) => {
    return count + countSyllables(word)
  }, 0)
  
  const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0
  const avgSyllablesPerWord = words.length > 0 ? syllables / words.length : 0
  
  // Simplified Flesch Reading Ease score
  const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
  
  let level = 'Easy'
  if (fleschScore < 30) level = 'Very Difficult'
  else if (fleschScore < 50) level = 'Difficult'
  else if (fleschScore < 60) level = 'Fairly Difficult'
  else if (fleschScore < 70) level = 'Standard'
  else if (fleschScore < 80) level = 'Fairly Easy'
  else if (fleschScore < 90) level = 'Easy'
  else level = 'Very Easy'
  
  return {
    score: Math.max(0, Math.min(100, fleschScore)),
    level,
    sentences: sentences.length,
    words: words.length,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10
  }
}

/**
 * Count syllables in a word (approximate)
 */
const countSyllables = (word) => {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (word.length <= 3) return 1
  
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
  word = word.replace(/^y/, '')
  
  const syllables = word.match(/[aeiouy]{1,2}/g)
  return syllables ? syllables.length : 1
}

/**
 * Main grammar and spelling check function
 * @param {string} title - Announcement title
 * @param {string} content - Announcement content
 * @returns {Object} Check results with issues and score
 */
export const checkGrammarAndSpelling = (title, content) => {
  const fullText = `${title} ${content}`
  
  // Run all checks
  const spellingIssues = checkSpelling(fullText)
  const grammarIssues = checkGrammar(fullText)
  const readability = calculateReadability(content)
  
  // Combine all issues
  const allIssues = [...spellingIssues, ...grammarIssues]
  
  // Calculate quality score (100 = perfect)
  const totalPenalty = allIssues.reduce((sum, issue) => {
    return sum + (SEVERITY_WEIGHTS[issue.severity] || 1)
  }, 0)
  
  // Score decreases with issues, minimum 0
  const qualityScore = Math.max(0, 100 - (totalPenalty * 5))
  
  // Categorize issues by severity
  const errors = allIssues.filter(i => i.severity === 'error')
  const warnings = allIssues.filter(i => i.severity === 'warning')
  const suggestions = allIssues.filter(i => i.severity === 'suggestion')
  
  return {
    hasIssues: allIssues.length > 0,
    qualityScore,
    issueCount: allIssues.length,
    errors,
    warnings,
    suggestions,
    allIssues,
    readability,
    summary: getSummary(errors.length, warnings.length, suggestions.length, qualityScore)
  }
}

/**
 * Get human-readable summary
 */
const getSummary = (errors, warnings, suggestions, score) => {
  if (errors === 0 && warnings === 0 && suggestions === 0) {
    return { status: 'excellent', message: 'No issues found! Your text looks great.' }
  }
  
  if (errors > 0) {
    return { 
      status: 'needs_attention', 
      message: `Found ${errors} error${errors > 1 ? 's' : ''} that should be fixed.`
    }
  }
  
  if (warnings > 0) {
    return { 
      status: 'review', 
      message: `Found ${warnings} potential issue${warnings > 1 ? 's' : ''} to review.`
    }
  }
  
  return { 
    status: 'good', 
    message: `Found ${suggestions} suggestion${suggestions > 1 ? 's' : ''} for improvement.`
  }
}

/**
 * Apply auto-corrections to text
 * @param {string} text - Text to correct
 * @returns {Object} Corrected text and changes made
 */
export const autoCorrect = (text) => {
  let correctedText = text
  const changes = []
  
  // Fix common misspellings
  Object.entries(COMMON_MISSPELLINGS).forEach(([wrong, right]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi')
    if (regex.test(correctedText)) {
      changes.push({ from: wrong, to: right, type: 'spelling' })
      correctedText = correctedText.replace(regex, right)
    }
  })
  
  // Fix double articles/determiners (e.g., "the your" -> "your", "a the" -> "the")
  const doubleArticlePatterns = [
    { pattern: /\b(the|a|an)\s+(the)\b/gi, replacement: 'the' },
    { pattern: /\b(the|a|an)\s+(a)\b/gi, replacement: 'a' },
    { pattern: /\b(the|a|an)\s+(an)\b/gi, replacement: 'an' },
    { pattern: /\b(the|a|an)\s+(your)\b/gi, replacement: 'your' },
    { pattern: /\b(the|a|an)\s+(my)\b/gi, replacement: 'my' },
    { pattern: /\b(the|a|an)\s+(his)\b/gi, replacement: 'his' },
    { pattern: /\b(the|a|an)\s+(her)\b/gi, replacement: 'her' },
    { pattern: /\b(the|a|an)\s+(its)\b/gi, replacement: 'its' },
    { pattern: /\b(the|a|an)\s+(our)\b/gi, replacement: 'our' },
    { pattern: /\b(the|a|an)\s+(their)\b/gi, replacement: 'their' }
  ]
  
  doubleArticlePatterns.forEach(({ pattern, replacement }) => {
    const matches = correctedText.match(pattern)
    if (matches) {
      matches.forEach(match => {
        changes.push({ from: match, to: replacement, type: 'grammar' })
      })
      correctedText = correctedText.replace(pattern, replacement)
    }
  })
  
  // Fix multiple spaces
  if (/\s{2,}/.test(correctedText)) {
    changes.push({ from: 'multiple spaces', to: 'single space', type: 'spacing' })
    correctedText = correctedText.replace(/\s{2,}/g, ' ')
  }
  
  // Fix "should of" -> "should have"
  const ofFixes = [
    { pattern: /\bshould of\b/gi, replacement: 'should have' },
    { pattern: /\bcould of\b/gi, replacement: 'could have' },
    { pattern: /\bwould of\b/gi, replacement: 'would have' },
    { pattern: /\bmight of\b/gi, replacement: 'might have' },
    { pattern: /\bmust of\b/gi, replacement: 'must have' }
  ]
  
  ofFixes.forEach(({ pattern, replacement }) => {
    if (pattern.test(correctedText)) {
      changes.push({ from: pattern.source.replace(/\\b/g, ''), to: replacement, type: 'grammar' })
      correctedText = correctedText.replace(pattern, replacement)
    }
  })
  
  return {
    original: text,
    corrected: correctedText,
    hasChanges: changes.length > 0,
    changes
  }
}

export default {
  checkSpelling,
  checkGrammar,
  checkGrammarAndSpelling,
  calculateReadability,
  autoCorrect
}
