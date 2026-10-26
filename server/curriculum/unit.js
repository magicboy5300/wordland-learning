// Compact authoring helpers: every question has an explicit answer and explanation.
export const q = (prompt, answer, wrong1, wrong2, explanation) => ({type:'choice',prompt,options:[answer,wrong1,wrong2],answer,hint:explanation,explanation});
export const o = (prompt, answer, explanation) => ({type:'order',prompt,options:[...answer].reverse(),answer,hint:explanation,explanation});
export const task = (title,prompt,outline,checklist,kind='write') => ({title,prompt,outline,checklist,kind});
export const u = (id,title,theme,text,words,reading,expression,activity,patterns) => ({id,title,theme,text,words,reading,expression,activity,patterns});
