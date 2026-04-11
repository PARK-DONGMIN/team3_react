function ScheduleItem({ title, dateRange }) {
  return (
    <div className="schedule-item">
      <h3>{title}</h3>
      <p>{dateRange}</p>
    </div>
  );
}

export default ScheduleItem;
