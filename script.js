import { collection, doc, setDoc, getDocs, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const db = window.db;

// ====== Login ======
window.checkPassword = function() {
  const input = document.getElementById("password-input").value;
  const errorMsg = document.getElementById("login-error");
  if(input === "Harsh@109") {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("app").style.display = "block";
    loadClassOptions();
    renderClasses();
    renderStudents();
    loadDashboardClasses();
    loadAttendanceClasses();
  } else {
    errorMsg.textContent = "Incorrect password!";
  }
}


// ===== Navigation =====
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(pageId).classList.remove('hidden');
  if (pageId==='classes') renderClasses();
  if (pageId==='students') renderStudents();
  if (pageId==='attendance') loadAttendanceClasses();
  if (pageId==='dashboard') loadDashboardClasses();
}

// ===== Classes ======
async function addClass() {
  const name = document.getElementById("classInput").value.trim();
  const section = document.getElementById("sectionInput").value.trim();
  if(!name || !section) return alert("Enter class & section!");
  await setDoc(doc(db,"classes",`${name}-${section}`),{name,section});
  document.getElementById("classInput").value="";
  document.getElementById("sectionInput").value="";
  renderClasses(); loadClassOptions();
}

async function renderClasses() {
  const list = document.getElementById("classList"); list.innerHTML="";
  const snapshot = await getDocs(collection(db,"classes"));
  snapshot.forEach(cDoc=>{
    const c=cDoc.data();
    const li=document.createElement("li");
    li.textContent=`${c.name}-${c.section}`;
    const btn=document.createElement("button"); btn.textContent="X";
    btn.onclick=async()=>{ await deleteDoc(doc(db,"classes",cDoc.id)); renderClasses(); loadClassOptions();}
    li.appendChild(btn); list.appendChild(li);
  });
}

// ===== Students ======
async function addStudent() {
  const name=document.getElementById("studentNameInput").value.trim();
  const classSel=document.getElementById("studentClassSelect").value;
  if(!name || !classSel) return alert("Enter student & class!");
  await setDoc(doc(db,"students",`${name}-${classSel}`),{name,class:classSel});
  document.getElementById("studentNameInput").value="";
  renderStudents();
}

async function renderStudents() {
  const list=document.getElementById("studentList"); list.innerHTML="";
  const snapshot=await getDocs(collection(db,"students"));
  snapshot.forEach(sDoc=>{
    const s=sDoc.data();
    const li=document.createElement("li");
    li.textContent=`${s.name} (${s.class})`;
    const btn=document.createElement("button"); btn.textContent="X";
    btn.onclick=async()=>{ await deleteDoc(doc(db,"students",sDoc.id)); renderStudents();}
    li.appendChild(btn); list.appendChild(li);
  });
  loadClassOptions();
}

// Populate dropdowns
async function loadClassOptions() {
  const selects=[document.getElementById("studentClassSelect"),document.getElementById("attendanceClassSelect"),document.getElementById("dashClassFilter")];
  const snapshot=await getDocs(collection(db,"classes"));
  selects.forEach(sel=>{
    if(!sel) return; sel.innerHTML="<option value=''>--Select--</option>";
    snapshot.forEach(cDoc=>{
      const c=cDoc.data();
      const opt=document.createElement("option"); opt.value=`${c.name}-${c.section}`; opt.textContent=`${c.name}-${c.section}`;
      sel.appendChild(opt);
    });
  });
}

// ===== Attendance ======
async function loadAttendanceClasses(){ loadClassOptions(); document.getElementById("attendanceList").innerHTML=""; }

async function loadAttendanceStudents(){
  const classSel=document.getElementById("attendanceClassSelect").value;
  const listDiv=document.getElementById("attendanceList"); listDiv.innerHTML="";
  const snapshot=await getDocs(collection(db,"students"));
  snapshot.forEach(sDoc=>{
    const s=sDoc.data();
    if(s.class===classSel){
      const row=document.createElement("div"); row.textContent=s.name;
      const btnP=document.createElement("button"); btnP.textContent="P"; btnP.className="attendance-btn present";
      btnP.onclick=()=>{btnP.classList.add("dark"); btnA.classList.remove("dark");}
      const btnA=document.createElement("button"); btnA.textContent="A"; btnA.className="attendance-btn absent";
      btnA.onclick=()=>{btnA.classList.add("dark"); btnP.classList.remove("dark");}
      row.appendChild(btnP); row.appendChild(btnA);
      listDiv.appendChild(row);
    }
  });
}

async function submitAttendance(){
  const date=document.getElementById("attendanceDate").value;
  const classSel=document.getElementById("attendanceClassSelect").value;
  if(!date || !classSel) return alert("Select date & class!");
  const attendanceData={};
  document.querySelectorAll("#attendanceList div").forEach(row=>{
    const name=row.firstChild.textContent;
    const status=row.querySelector(".dark")?.textContent || "N";
    attendanceData[name]=status;
  });
  await setDoc(doc(db,"attendance",`${classSel}-${date}`),{class:classSel,date,data:attendanceData});
  alert("Attendance Saved!");
}

// ===== Dashboard =====
async function loadDashboardClasses(){ loadClassOptions(); document.getElementById("dashboardData").innerHTML=""; }

async function loadDashboardStudents(){
  const classSel=document.getElementById("dashClassFilter").value;
  const stuSel=document.getElementById("dashStudentFilter"); stuSel.innerHTML="<option value=''>--Select--</option>";
  const snapshot=await getDocs(collection(db,"students"));
  snapshot.forEach(sDoc=>{ const s=sDoc.data(); if(!classSel||s.class===classSel){ const opt=document.createElement("option"); opt.value=s.name; opt.textContent=s.name; stuSel.appendChild(opt); }});
  showStudentAttendance();
}

async function showStudentAttendance(){
  const classSel=document.getElementById("dashClassFilter").value;
  const stuSel=document.getElementById("dashStudentFilter").value;
  const dateSel=document.getElementById("dashDateFilter").value;
  const div=document.getElementById("dashboardData"); div.innerHTML="";
  const snapshot=await getDocs(collection(db,"attendance"));
  snapshot.forEach(aDoc=>{ const att=aDoc.data();
    if(classSel && att.class!==classSel) return;
    if(dateSel && att.date!==dateSel) return;
    for(let stu in att.data){ if(stuSel && stu!==stuSel) continue;
      div.innerHTML+=`${att.date} - ${stu} (${att.class}): ${att.data[stu]}<br>`;
    }
  });
}

// ===== Export CSV =====
async function exportCSV(){
  let csv="Date,Class,Student,Status\n";
  const snapshot=await getDocs(collection(db,"attendance"));
  snapshot.forEach(aDoc=>{
    const att=aDoc.data();
    for(let stu in att.data){
      csv+=`${att.date},${att.class},${stu},${att.data[stu]}\n`;
    }
  });
  const blob=new Blob([csv],{type:"text/csv"});
  const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="attendance.csv"; a.click();
}

// ===== Initial Load =====
showPage('dashboard');

