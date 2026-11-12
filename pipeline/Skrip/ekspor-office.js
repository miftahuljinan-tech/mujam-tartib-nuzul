/* Pembuat berkas Word (.docx) dan Excel (.xlsx) tanpa pustaka tambahan, berjalan offline.
   Disisipkan ke templat aplikasi oleh buat_aplikasi.py (penanda EKSPOR_OFFICE) dan diuji dengan node.
   Zip dibuat tanpa kompresi (metode "simpan"), cukup untuk berkas sekecil ini. */
const OFC=(function(){
const TE=new TextEncoder();
const u8=s=>typeof s==="string"?TE.encode(s):s;

/* ---------- ZIP ---------- */
let CRC_T=null;
function crc32(b){
  if(!CRC_T){CRC_T=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;CRC_T[n]=c>>>0}}
  let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC_T[(c^b[i])&255]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
}
function zip(files){
  const DATE=((2026-1980)<<9)|(1<<5)|1,TIME=0;
  const locals=[],cents=[];let off=0;
  for(const [name,content] of files){
    const nb=TE.encode(name),d=u8(content),crc=crc32(d);
    const lh=new Uint8Array(30+nb.length),lv=new DataView(lh.buffer);
    lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x0800,true);lv.setUint16(8,0,true);
    lv.setUint16(10,TIME,true);lv.setUint16(12,DATE,true);lv.setUint32(14,crc,true);
    lv.setUint32(18,d.length,true);lv.setUint32(22,d.length,true);lv.setUint16(26,nb.length,true);lv.setUint16(28,0,true);
    lh.set(nb,30);
    const ch=new Uint8Array(46+nb.length),cv=new DataView(ch.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);cv.setUint16(10,0,true);
    cv.setUint16(12,TIME,true);cv.setUint16(14,DATE,true);cv.setUint32(16,crc,true);
    cv.setUint32(20,d.length,true);cv.setUint32(24,d.length,true);cv.setUint16(28,nb.length,true);
    cv.setUint16(30,0,true);cv.setUint16(32,0,true);cv.setUint16(34,0,true);cv.setUint16(36,0,true);cv.setUint32(38,0,true);cv.setUint32(42,off,true);
    ch.set(nb,46);
    locals.push(lh,d);cents.push(ch);off+=lh.length+d.length;
  }
  const cdSize=cents.reduce((a,x)=>a+x.length,0);
  const end=new Uint8Array(22),ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);
  ev.setUint32(12,cdSize,true);ev.setUint32(16,off,true);
  const all=[...locals,...cents,end];
  const out=new Uint8Array(all.reduce((a,x)=>a+x.length,0));let p=0;
  for(const x of all){out.set(x,p);p+=x.length}
  return out;
}

/* ---------- XML ---------- */
const BAD=/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;
const xe=s=>String(s??"").replace(BAD,"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const XH='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS_W='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const AR_FONT="Amiri Quran",AR_ALT="Traditional Arabic",LAT_FONT="Times New Roman";

/* ---------- DOCX ---------- */
/* Sel Arab: larik potongan {t:teks, b:true|false}. Sel lain: teks biasa. */
function wRun(t,o){
  o=o||{};
  let rp="";
  if(o.ar)rp+=`<w:rFonts w:ascii="${AR_FONT}" w:hAnsi="${AR_FONT}" w:cs="${AR_FONT}"/>`;
  if(o.b)rp+="<w:b/><w:bCs/>";
  if(o.i)rp+="<w:i/><w:iCs/>";
  if(o.color)rp+=`<w:color w:val="${o.color}"/>`;
  if(o.sz)rp+=`<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>`;
  if(o.ar)rp+='<w:rtl/><w:lang w:bidi="ar-SA"/>';
  return `<w:r>${rp?`<w:rPr>${rp}</w:rPr>`:""}<w:t xml:space="preserve">${xe(t)}</w:t></w:r>`;
}
function wPara(runs,o){
  o=o||{};
  let pp="";
  if(o.style)pp+=`<w:pStyle w:val="${o.style}"/>`;
  if(o.keep)pp+="<w:keepNext/>";
  if(o.bidi)pp+="<w:bidi/>";
  pp+=`<w:spacing w:before="${o.before??0}" w:after="${o.after??0}"${o.line?` w:line="${o.line}" w:lineRule="auto"`:""}/>`;
  if(o.jc)pp+=`<w:jc w:val="${o.jc}"/>`;
  return `<w:p><w:pPr>${pp}</w:pPr>${runs}</w:p>`;
}
function wCell(inner,w,o){
  o=o||{};
  return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${o.fill?`<w:shd w:val="clear" w:color="auto" w:fill="${o.fill}"/>`:""}${o.va?`<w:vAlign w:val="${o.va}"/>`:""}</w:tcPr>${inner}</w:tc>`;
}
function arParas(segs,sz){
  if(typeof segs==="string")segs=[{t:segs}];
  const runs=segs.map(s=>wRun(s.t,{ar:true,b:!!s.b,sz:sz||32})).join("");
  return wPara(runs,{bidi:true,line:360});
}
function docxBytes(o){
  const cols=o.cols,W=cols.reduce((a,c)=>a+c.w,0);
  const grid=cols.map(c=>`<w:gridCol w:w="${c.w}"/>`).join("");
  const head=`<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>${cols.map(c=>wCell(wPara(wRun(c.h,{b:true,sz:20}),{jc:"center"}),c.w,{fill:"E3EEEA",va:"center"})).join("")}</w:tr>`;
  const rows=o.rows.map(r=>`<w:tr><w:trPr><w:cantSplit/></w:trPr>${cols.map((c,j)=>{
    const v=r[j];let inner;
    if(c.type==="ar")inner=arParas(v,o.arSz);
    else if(c.type==="ctr")inner=wPara(wRun(v??"",{sz:20}),{jc:"center"});
    else inner=wPara(wRun(v??"",{sz:21}),{});
    return wCell(inner,c.w,{va:c.type==="ar"?"top":"top"});
  }).join("")}</w:tr>`).join("");
  const bd=["top","left","bottom","right","insideH","insideV"].map(k=>`<w:${k} w:val="single" w:sz="4" w:space="0" w:color="9AA5A1"/>`).join("");
  const tbl=`<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:tblBorders>${bd}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="70" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${head}${rows}</w:tbl>`;
  const notes=(o.notes||[]).map(t=>wPara(wRun(t,{sz:18,color:"555555"}),{before:60})).join("");
  const sect=`<w:sectPr><w:footerReference w:type="default" r:id="rId3"/><w:pgSz w:w="${o.landscape?16838:11906}" w:h="${o.landscape?11906:16838}"${o.landscape?' w:orient="landscape"':""}/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>`;
  const body=wPara(wRun(o.title,{}),{style:"Heading1",after:60})+(o.subtitle?wPara(wRun(o.subtitle,{sz:20,color:"444444"}),{after:160}):"")+tbl+wPara("",{before:120})+notes+sect;
  const doc=`${XH}<w:document ${NS_W}><w:body>${body}</w:body></w:document>`;
  const styles=`${XH}<w:styles ${NS_W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${LAT_FONT}" w:hAnsi="${LAT_FONT}" w:eastAsia="${LAT_FONT}" w:cs="${AR_ALT}"/><w:sz w:val="22"/><w:szCs w:val="28"/><w:lang w:val="id-ID" w:eastAsia="en-US" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="1F6F5C"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:rPr><w:sz w:val="18"/><w:color w:val="666666"/></w:rPr></w:style></w:styles>`;
  const fontTable=`${XH}<w:fonts ${NS_W}><w:font w:name="${AR_FONT}"><w:altName w:val="${AR_ALT}"/><w:charset w:val="B2"/><w:family w:val="auto"/><w:pitch w:val="variable"/></w:font><w:font w:name="${LAT_FONT}"><w:panose1 w:val="02020603050405020304"/><w:charset w:val="00"/><w:family w:val="roman"/><w:pitch w:val="variable"/></w:font></w:fonts>`;
  const footer=`${XH}<w:ftr ${NS_W}><w:p><w:pPr><w:pStyle w:val="Footer"/><w:tabs><w:tab w:val="right" w:pos="14570"/></w:tabs></w:pPr><w:r><w:t xml:space="preserve">${xe(o.footer||"Mu'jam Tartib Nuzul")}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`;
  const ct=`${XH}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
  const rels=`${XH}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const drels=`${XH}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>`;
  const now=new Date().toISOString().replace(/\.\d+Z$/,"Z");
  const core=`${XH}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xe(o.title)}</dc:title><dc:creator>Mu'jam Tartib Nuzul</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
  return zip([["[Content_Types].xml",ct],["_rels/.rels",rels],["word/document.xml",doc],["word/styles.xml",styles],["word/fontTable.xml",fontTable],["word/footer1.xml",footer],["word/_rels/document.xml.rels",drels],["docProps/core.xml",core]]);
}

/* ---------- XLSX ---------- */
const colName=i=>{let s="";i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s};
/* gaya sel: 0 biasa, 1 judul kolom, 2 teks, 3 Arab, 4 angka tengah, 5 catatan, 6 teks tengah */
const ST={txt:2,ar:3,num:4,ctr:6};
function xlsxBytes(o){
  const sheets=o.sheets;
  const sx=sheets.map(sh=>{
    const nc=sh.cols.length;
    const colsXml=`<cols>${sh.cols.map((c,i)=>`<col min="${i+1}" max="${i+1}" width="${c.w}" customWidth="1"/>`).join("")}</cols>`;
    const cell=(r,c,v,s)=>{
      const ref=colName(c)+(r+1);
      if(v===null||v===undefined||v==="")return `<c r="${ref}" s="${s}"/>`;
      if(typeof v==="number"&&isFinite(v))return `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
      return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xe(v)}</t></is></c>`;
    };
    let rowsXml=`<row r="1" ht="22" customHeight="1">${sh.cols.map((c,j)=>cell(0,j,c.h,1)).join("")}</row>`;
    sh.rows.forEach((r,i)=>{rowsXml+=`<row r="${i+2}">${sh.cols.map((c,j)=>cell(i+1,j,r[j],ST[c.type]||2)).join("")}</row>`});
    const last=sh.rows.length+1;
    (sh.notes||[]).forEach((t,k)=>{const rr=last+2+k;rowsXml+=`<row r="${rr}">${cell(rr-1,0,t,5)}</row>`});
    const filt=sh.rows.length?`<autoFilter ref="A1:${colName(nc-1)}${last}"/>`:"";
    return `${XH}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${colsXml}<sheetData>${rowsXml}</sheetData>${filt}<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToHeight="0"/></worksheet>`;
  });
  const styles=`${XH}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><sz val="16"/><name val="${AR_ALT}"/><family val="1"/><charset val="178"/></font><font><i/><sz val="10"/><color rgb="FF555555"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE3EEEA"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF9AA5A1"/></left><right style="thin"><color rgb="FF9AA5A1"/></right><top style="thin"><color rgb="FF9AA5A1"/></top><bottom style="thin"><color rgb="FF9AA5A1"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top" wrapText="1" readingOrder="2"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf><xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const wb=`${XH}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sh,i)=>`<sheet name="${xe(sh.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets></workbook>`;
  const wrels=`${XH}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const ct=`${XH}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  const rels=`${XH}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  return zip([["[Content_Types].xml",ct],["_rels/.rels",rels],["xl/workbook.xml",wb],["xl/_rels/workbook.xml.rels",wrels],["xl/styles.xml",styles],...sx.map((x,i)=>[`xl/worksheets/sheet${i+1}.xml`,x])]);
}
return {zip,crc32,docx:docxBytes,xlsx:xlsxBytes,xe};
})();
if(typeof module!=="undefined")module.exports=OFC;
