<?php

require __DIR__ . '/../vendor/autoload.php';

use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\SimpleType\Jc;
use PhpOffice\PhpWord\SimpleType\LineSpacingRule;

$out = 'C:\\Users\\emir\\Desktop\\rapor_codex.docx';

$phpWord = new PhpWord();
$phpWord->setDefaultFontName('Times New Roman');
$phpWord->setDefaultFontSize(10);

$phpWord->addParagraphStyle('IEEEBody', [
    'alignment' => Jc::BOTH,
    'spaceAfter' => 80,
    'lineSpacingRule' => LineSpacingRule::AUTO,
    'lineHeight' => 1.03,
]);
$phpWord->addParagraphStyle('IEEEHeading', [
    'alignment' => Jc::CENTER,
    'spaceBefore' => 120,
    'spaceAfter' => 80,
    'keepNext' => true,
]);
$phpWord->addParagraphStyle('IEEECaption', [
    'alignment' => Jc::CENTER,
    'spaceBefore' => 60,
    'spaceAfter' => 120,
]);
$phpWord->addParagraphStyle('IEEERef', [
    'alignment' => Jc::LEFT,
    'spaceAfter' => 40,
]);
$phpWord->addParagraphStyle('CenterSmall', [
    'alignment' => Jc::CENTER,
    'spaceAfter' => 40,
]);
$phpWord->addFontStyle('TitleFont', [
    'name' => 'Times New Roman',
    'size' => 18,
    'bold' => true,
]);
$phpWord->addFontStyle('AuthorFont', [
    'name' => 'Times New Roman',
    'size' => 10,
]);
$phpWord->addFontStyle('BodyFont', [
    'name' => 'Times New Roman',
    'size' => 10,
]);
$phpWord->addFontStyle('BoldFont', [
    'name' => 'Times New Roman',
    'size' => 10,
    'bold' => true,
]);
$phpWord->addFontStyle('HeadingFont', [
    'name' => 'Times New Roman',
    'size' => 10,
    'bold' => true,
    'allCaps' => true,
]);
$phpWord->addFontStyle('CaptionFont', [
    'name' => 'Times New Roman',
    'size' => 9,
    'italic' => true,
]);
$phpWord->addFontStyle('MonoSmall', [
    'name' => 'Courier New',
    'size' => 8,
]);

$titleSection = $phpWord->addSection([
    'pageSizeW' => 12240,
    'pageSizeH' => 15840,
    'marginTop' => 720,
    'marginBottom' => 720,
    'marginLeft' => 720,
    'marginRight' => 720,
]);

$titleSection->addText('Zirai İlaç Satışı Web Tabanlı Yönetim Uygulaması', 'TitleFont', [
    'alignment' => Jc::CENTER,
    'spaceAfter' => 160,
]);
$titleSection->addText('Süleyman Emir Kaya', 'AuthorFont', 'CenterSmall');
$titleSection->addText('Öğrenci No: 221307026', 'AuthorFont', 'CenterSmall');
$titleSection->addText('Bilişim Sistemleri Mühendisliği, Kocaeli Üniversitesi Teknoloji Fakültesi', 'AuthorFont', 'CenterSmall');
$titleSection->addText('TBL304 Web Programlama 2025-2026 Bahar', 'AuthorFont', 'CenterSmall');

$section = $phpWord->addSection([
    'breakType' => 'continuous',
    'pageSizeW' => 12240,
    'pageSizeH' => 15840,
    'marginTop' => 720,
    'marginBottom' => 720,
    'marginLeft' => 720,
    'marginRight' => 720,
    'colsNum' => 2,
    'colsSpace' => 360,
]);

function heading($section, string $text): void
{
    $section->addText($text, 'HeadingFont', 'IEEEHeading');
}

function para($section, string $text): void
{
    $section->addText($text, 'BodyFont', 'IEEEBody');
}

function caption($section, string $text): void
{
    $section->addText($text, 'CaptionFont', 'IEEECaption');
}

function addKeyValueTable($section, array $rows): void
{
    $table = $section->addTable([
        'borderSize' => 4,
        'borderColor' => '808080',
        'cellMargin' => 80,
        'width' => 4550,
        'unit' => 'dxa',
    ]);
    foreach ($rows as [$key, $value]) {
        $table->addRow();
        $table->addCell(1450, ['bgColor' => 'F2F2F2', 'valign' => 'center'])->addText($key, 'BoldFont', ['spaceAfter' => 0]);
        $table->addCell(3100, ['valign' => 'center'])->addText($value, 'BodyFont', ['spaceAfter' => 0]);
    }
}

function addFlowDiagram($section): void
{
    $rows = [
        ['1', 'Kullanıcı admin hesabı ile giriş yapar.'],
        ['2', 'Dashboard stok, satış, alacak ve verecek özetlerini yükler.'],
        ['3', 'Satış ekranında ürün, miktar ve ödeme türü seçilir.'],
        ['4', 'Nakit satışta satış kaydı açılır ve stok düşülür.'],
        ['5', 'Kısmi veya alacaklı satışta borçlu kişi seçilir.'],
        ['6', 'debtor_transactions kaydı ürünün tam tutarı ile açılır.'],
        ['7', 'Peşinat varsa debt_payments kaydına oransal ödeme yazılır.'],
        ['8', 'Alacak ekranında FIFO ödeme ile en eski borçtan kapatma yapılır.'],
    ];
    $table = $section->addTable([
        'borderSize' => 4,
        'borderColor' => '595959',
        'cellMargin' => 85,
        'width' => 4550,
        'unit' => 'dxa',
    ]);
    foreach ($rows as [$no, $text]) {
        $table->addRow();
        $table->addCell(450, ['bgColor' => 'E2F0D9', 'valign' => 'center'])->addText($no, 'BoldFont', ['alignment' => Jc::CENTER, 'spaceAfter' => 0]);
        $table->addCell(4100, ['valign' => 'center'])->addText($text, 'BodyFont', ['spaceAfter' => 0]);
    }
}

function addErDiagram($section): void
{
    $rows = [
        ['users', 'Admin hesabı ve kimlik doğrulama kayıtları'],
        ['products', 'Stok kartları, kategori, fiyat ve minimum stok'],
        ['sales', 'Satış kayıtları ve ödeme türü'],
        ['debtors', 'Alacaklı müşteri bilgileri'],
        ['debtor_transactions', 'Müşteri borç hareketleri'],
        ['debt_payments', 'FIFO mantığıyla borç ödemeleri'],
        ['creditors', 'Tedarikçi/cari kişi bilgileri'],
        ['creditor_transactions', 'Verecek/alım hareketleri'],
        ['creditor_payments', 'Tedarikçi ödeme kayıtları'],
        ['eski_alacaklar', 'Sistem öncesi devreden eski alacaklar'],
    ];
    $table = $section->addTable([
        'borderSize' => 4,
        'borderColor' => '595959',
        'cellMargin' => 80,
        'width' => 4550,
        'unit' => 'dxa',
    ]);
    $table->addRow();
    $table->addCell(1550, ['bgColor' => 'D9EAF7'])->addText('Varlık', 'BoldFont', ['alignment' => Jc::CENTER, 'spaceAfter' => 0]);
    $table->addCell(3000, ['bgColor' => 'D9EAF7'])->addText('Rol / İlişki', 'BoldFont', ['alignment' => Jc::CENTER, 'spaceAfter' => 0]);
    foreach ($rows as [$entity, $role]) {
        $table->addRow();
        $table->addCell(1550, ['valign' => 'center'])->addText($entity, 'MonoSmall', ['spaceAfter' => 0]);
        $table->addCell(3000, ['valign' => 'center'])->addText($role, 'BodyFont', ['spaceAfter' => 0]);
    }
}

heading($section, 'Özet');
para($section, 'Bu rapor, Laravel 12 ve PHP 8.2 kullanılarak geliştirilen Zinar Zirai İlaç Satışı adlı web tabanlı yönetim uygulamasını IEEE biçimine yakın bir akademik rapor yapısında sunmaktadır. Uygulama; stok yönetimi, nakit/kısmi/alacaklı satış, tarih filtreli dashboard, FIFO mantığıyla alacak takibi, verecekler ve eski borçlar modüllerinden oluşmaktadır. Veriler MySQL üzerinde zinar_tarim veritabanında tutulmakta, ön yüzde Vanilla JavaScript ve Excel dışa aktarımı için SheetJS kullanılmaktadır.');

heading($section, 'I. Giriş');
para($section, 'Zirai ilaç, gübre, tohum ve ekipman satışı yapan işletmelerde stok miktarı, satış biçimi ve cari borç hareketleri günlük operasyonun temel verileridir. Manuel takip yöntemleri hem ürün hareketlerinde hem de alacak/verecek kayıtlarında hata riskini artırmaktadır. Bu çalışma kapsamında geliştirilen uygulama, küçük ve orta ölçekli zirai satış işletmelerinin stok ve cari takibini tek bir web arayüzünde yönetmesini amaçlamaktadır.');
para($section, 'Uygulama sadece admin girişi ile kullanılacak şekilde tasarlanmıştır. Laravel Breeze kimlik doğrulama altyapısı kullanılmış, fakat bu raporda role dayalı çok kullanıcılı bir yetkilendirme modülü varmış gibi bir varsayım yapılmamıştır. GitHub ve canlı site bağlantıları proje teslimi sırasında eklenecek alanlar olarak bırakılmıştır: GitHub: [EKLENECEK], Canlı site: [EKLENECEK].');

heading($section, 'II. Yöntem');
para($section, 'Proje Laravel 12 çatısı üzerinde PHP 8.2 ile geliştirilmiştir. Veritabanı katmanı MySQL kullanmakta ve ana veritabanı adı zinar_tarim olarak tanımlanmaktadır. Arayüz tarafında framework kullanılmadan Vanilla JavaScript tercih edilmiş, Excel yedekleme/dışa aktarma işlemleri için SheetJS kütüphanesi eklenmiştir.');
addKeyValueTable($section, [
    ['Framework', 'Laravel 12'],
    ['Dil', 'PHP 8.2, Vanilla JavaScript'],
    ['Veritabanı', 'MySQL - zinar_tarim'],
    ['Auth', 'Laravel Breeze; uygulama kullanımı admin girişi ile sınırlandırılmıştır'],
    ['Tablo', '10 ana tablo'],
    ['Dışa Aktarım', 'SheetJS ile Excel export'],
]);
caption($section, 'Tablo I. Kullanılan teknolojiler ve proje bileşenleri.');
para($section, 'Veri modeli users, products, sales, debtors, debtor_transactions, debt_payments, creditors, creditor_transactions, creditor_payments ve eski_alacaklar tablolarından oluşmaktadır. Uygulama veri setinde 20 ürün bulunmaktadır. Kategori bilgisi proje gereksiniminde Gübre, İlaç, Tohum, Haşere, Zehir ve Ekipman olarak tanımlanmıştır; mevcut veritabanı kontrolünde ürün kayıtları Gübre, İlaç, Tohum, Zehir ve Ekipman kategorilerinde görünmektedir.');

heading($section, 'III. Akış Diyagramı');
para($section, 'Satış akışı, ürün seçimi ile başlayıp ödeme türüne göre farklı dallara ayrılmaktadır. Nakit satışta borç hareketi oluşturulmazken, kısmi ve alacaklı satışlarda borçlu müşteri seçimi zorunlu tutulmuştur. Kısmi ödemede ürünün tam hareket tutarı borç kaydına yazılır, peşinat ise ödeme tablosunda ayrı kayıt olarak tutulur.');
addFlowDiagram($section);
caption($section, 'Şekil 1. Satış ve alacak yönetimi akış diyagramı.');

$section->addPageBreak();
heading($section, 'IV. Varlık-İlişki Diyagramı');
para($section, 'Veritabanı tasarımında stok, satış ve cari hareketler ayrı tablolarda tutulmuştur. Bu yaklaşım satış kaydı ile borç/ödeme kayıtlarının birbirinden ayrılmasını sağlar. Böylece alacak ve verecek modülleri kendi ödeme hareketlerini yönetirken stok ve satış raporları bağımsız şekilde üretilebilir.');
addErDiagram($section);
caption($section, 'Şekil 2. Temel varlıklar ve ilişkisel roller.');

heading($section, 'V. Deneysel Sonuçlar');
para($section, 'Uygulama üzerinde ürün listeleme, stok güncelleme, satış oluşturma, kısmi ödeme kaydetme, alacaklı müşteri hareketlerini görüntüleme, FIFO ödeme dağıtımı ve Excel yedekleme akışları test edilmiştir. Satış işleminde ürün stoku düşürülmekte, sales tablosuna satış kaydı yazılmakta ve ödeme türüne göre debtor_transactions ile debt_payments tablolarına ek kayıt oluşturulmaktadır.');
para($section, 'Dashboard modülü tarih filtreli özetler üretmekte; stok, satış, alacak ve verecek değerlerinin ekranda hızlı izlenmesini sağlamaktadır. Alacaklar ekranında ödeme girişi en eski borçtan başlayacak şekilde FIFO mantığıyla dağıtılmaktadır. Bu davranış, parçalı ödeme senaryolarında müşteri borcunun izlenmesini kolaylaştırmaktadır.');

heading($section, 'VI. Kazanımlar');
para($section, 'Bu proje ile Laravel routing, migration, seeder, controller ve authentication yapıları uygulamalı olarak kullanılmıştır. Ayrıca Vanilla JavaScript ile modal yönetimi, dinamik listeleme, fetch tabanlı API kullanımı, tarih filtresi, hesaplama mantıkları ve Excel export gibi web programlama konuları gerçek bir işletme senaryosu üzerinde uygulanmıştır.');
para($section, 'Veritabanı tasarımı açısından satış ile cari hareketlerin ayrıştırılması, ödeme kayıtlarının işlem bazında tutulması ve eski alacaklar için ayrı tablo kullanılması öğrenilen önemli kazanımlardır. Proje ayrıca kullanıcı arayüzü ve veri tutarlılığı arasındaki ilişkinin önemini göstermiştir.');

heading($section, 'VII. Sonuç');
para($section, 'Zinar Zirai İlaç Satışı uygulaması, zirai satış işletmelerinde stok, satış ve cari takip ihtiyaçlarını web tabanlı bir yapı altında toplamaktadır. Laravel 12 ve MySQL tabanlı mimari, uygulamanın genişletilebilir olmasını sağlamaktadır. İlerleyen aşamalarda kullanıcı yetkilendirme seviyeleri, ayrıntılı raporlama, canlı yayın ortamı ve otomatik yedekleme gibi özellikler eklenerek sistem kurumsal kullanıma daha uygun hale getirilebilir.');

heading($section, 'Kaynakça');
$refs = [
    '[1] Laravel, "Laravel 12 Documentation," Laravel LLC, 2026. [Çevrimiçi]. Erişim: https://laravel.com/docs',
    '[2] PHP Group, "PHP Manual," 2026. [Çevrimiçi]. Erişim: https://www.php.net/manual/',
    '[3] Oracle, "MySQL Documentation," 2026. [Çevrimiçi]. Erişim: https://dev.mysql.com/doc/',
    '[4] SheetJS, "SheetJS Community Edition Documentation," 2026. [Çevrimiçi]. Erişim: https://docs.sheetjs.com/',
    '[5] IEEE, "IEEE Editorial Style Manual for Authors," IEEE, 2024.',
];
foreach ($refs as $ref) {
    $section->addText($ref, 'BodyFont', 'IEEERef');
}

$writer = IOFactory::createWriter($phpWord, 'Word2007');
$writer->save($out);

echo $out . PHP_EOL;
