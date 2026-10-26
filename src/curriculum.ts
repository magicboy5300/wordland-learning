export const gradeLabel = (grade: number) => grade >= 1 && grade <= 6 ? `${['','一','二','三','四','五','六'][grade]}年级` : '跨年级';
export function readCourseSelection(): {grade?:number;semester?:string} {
  try { const value=JSON.parse(localStorage.getItem('wordland-course') || '{}'); return {grade:Number.isInteger(value.grade)&&value.grade>=1&&value.grade<=6?value.grade:undefined,semester:['上册','下册'].includes(value.semester)?value.semester:undefined}; } catch {return {};}
}
export function saveCourseSelection(grade:number,semester:string) {try {localStorage.setItem('wordland-course',JSON.stringify({grade,semester}));} catch { /* Browsing remains usable when storage is disabled. */ }}

export function adventureRoutePath(grade: number, semester: string, unit: string) {
  return `adventure/route/${grade}/${semester === '下册' ? 'lower' : 'upper'}/${encodeURIComponent(unit)}`;
}
export function parseAdventureRoute(route: string) {
  const match = /^adventure\/route\/([1-6])\/(upper|lower)\/([^/]+)$/.exec(route);
  if (!match) return null;
  try { return {grade: Number(match[1]), semester: match[2] === 'lower' ? '下册' : '上册', unit: decodeURIComponent(match[3])}; }
  catch { return null; }
}
