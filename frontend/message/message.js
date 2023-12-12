const statusList = {
  1: "Ошибки не было",
  2: "Ошибка была, получилось исправить",
  3: "Ошибка была, не смогли исправить",
  4: "Ошибка была, не нашли",
}

export const message = (original, encoded, corrupted, decoded, errorCount, status) => {
	return `
<div class="message message-${status}">
  <div class="errors_count">Количество ошибок: ${errorCount}</div>
  
  <div class="comparison">
    <div>
      <div class="comparison__message corrupted">
        <div class="title">Полученное сообщение: </div>
        <div class="content">${corrupted}</div>
      </div>
      <div class="comparison__message encoded">
        <div class="title">Отправленное сообщение: </div>
        <div class="content">${encoded}</div>
      </div>
    </div>

    <div>
      <div class="comparison__message decoded">
        <div class="title">Раскодированное сообщение: </div>
        <div class="content">${decoded}</div>
      </div>
      <div class="comparison__message original">
        <div class="title">Оригинальное сообщение: </div>
        <div class="content">${original}</div>
      </div>
    </div>
  </div>
  
  <div class="conclusion">${statusList[status]}</div>
</div>
	`;
}