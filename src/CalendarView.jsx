import React, { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


const CalendarView = ({ timeEntries = [], projects = [] }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewType, setViewType] = useState('month'); // 'month' or 'week'
  const [selectedProject, setSelectedProject] = useState('all');

  // Then, validate and process input props
  const validProjects = Array.isArray(projects) ? projects : [];
  const validEntries = Array.isArray(timeEntries) ? timeEntries : [];

  // Helper functions
  const getProjectColor = (projectId) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'
    ];
    return colors[projectId % colors.length];
  };

    
  const chartData = useMemo(() => {
    const data = {};
  
    validEntries.forEach(entry => {
      if (!entry?.date) return;
  
      const date = new Date(entry.date);
      let key;
  
      if (viewType === 'month') {
        // Monthly grouping: Use zero-based month, formatted for readability
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // Use 1-based month for key
      } else {
        // Weekly grouping
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      }
  
      if (!data[key]) {
        data[key] = {
          period: key,
          total: 0,
          byProject: {},
        };
      }
  
      const hours = Number(entry.hours) || 0;
      data[key].total += hours;
  
      if (entry.projectId) {
        const projectId = entry.projectId.toString();
        if (!data[key].byProject[projectId]) {
          data[key].byProject[projectId] = 0;
        }
        data[key].byProject[projectId] += hours;
      }
    });
  
    // Convert to array and sort by date
    return Object.values(data)
      .sort((a, b) => a.period.localeCompare(b.period))
      .map(item => {
        const [year, month] = item.period.split('-'); // Extract year and month
        const displayDate = new Date(year, month - 1, 1); // month is 1-based in key, so subtract 1 for Date constructor
  
        const result = {
          period: viewType === 'month'
            ? displayDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
            : new Date(item.period).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          total: Number(item.total.toFixed(1)),
        };
  
        // Add individual project data if not filtered
        if (selectedProject === 'all') {
          validProjects.forEach(project => {
            const projectHours = item.byProject[project.id]?.toFixed(1) || 0;
            result[project.name] = Number(projectHours);
          });
        }
  
        return result;
      });
  }, [validEntries, viewType, selectedProject, validProjects]);
  

  // Generate calendar data
  const calendarData = useMemo(() => {
    const filtered = selectedProject === 'all' 
      ? [...validEntries] 
      : validEntries.filter(entry => entry.projectId?.toString() === selectedProject);

    if (viewType === 'month') {
      return filtered.reduce((acc, entry) => {
        if (!entry?.date) return acc;
        
        const date = entry.date;
        if (!acc[date]) {
        acc[date] = {
          total: 0,
          entries: [],
          byProject: {}
        };
      }
      
      const hours = Number(entry.hours) || 0;
      acc[date].total += hours;
      
      const projectId = entry.projectId?.toString();
      if (projectId) {
        if (!acc[date].byProject[projectId]) {
          acc[date].byProject[projectId] = {
            hours: 0,
            name: validProjects.find(p => p.id === entry.projectId)?.name || 'Unknown',
            color: getProjectColor(entry.projectId)
          };
        }
        acc[date].byProject[projectId].hours += hours;
      }
      
      acc[date].entries.push({
        ...entry,
        hours,
        projectName: validProjects.find(p => p.id === entry.projectId)?.name || 'Unknown',
        projectColor: getProjectColor(entry.projectId)
      });
        return acc;
      }, {});
    } else {
      const weekData = {};
      filtered.forEach(entry => {
        if (!entry?.date) return;
        
        const date = new Date(entry.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weekData[weekKey]) {
          weekData[weekKey] = {
            total: 0,
            byProject: {}
          };
        }
        
        const hours = Number(entry.hours) || 0;
        weekData[weekKey].total += hours;
        
        const projectId = entry.projectId?.toString();
        if (projectId && !weekData[weekKey].byProject[projectId]) {
          weekData[weekKey].byProject[projectId] = {
            hours: 0,
            name: validProjects.find(p => p.id === entry.projectId)?.name || 'Unknown',
            color: getProjectColor(entry.projectId)
          };
        }
        if (projectId) {
          weekData[weekKey].byProject[projectId].hours += hours;
        }
      });
      return weekData;
    }
  }, [validEntries, selectedProject, viewType, validProjects]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    
    for (let i = 0; i < firstDay.getDay(); i++) {
      const prevDate = new Date(year, month, -i);
      days.unshift(prevDate);
    }
    
    for (let date = 1; date <= lastDay.getDate(); date++) {
      days.push(new Date(year, month, date));
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  };

  const getWeeksInView = () => {
    const currentDate = new Date(selectedDate);
    const weeks = [];
    currentDate.setDate(1);
    
    while (currentDate.getMonth() === selectedDate.getMonth()) {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay());
      weeks.push(weekStart);
      currentDate.setDate(currentDate.getDate() + 7);
    }
    
    return weeks;
  };

  const formatDate = (date) => {
    return new Date(date).toISOString().split('T')[0];
  };

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    if (viewType === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else {
      newDate.setDate(newDate.getDate() + (direction * 7));
    }
    setSelectedDate(newDate);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
      <div className='bg-white p-4 rounded shadow'>
        <Card className="p-6">
          {/* Controls */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-6 items-center mb-6">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => navigateDate(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-bold">
                  {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => navigateDate(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>


            
            <div className="flex gap-4">
              <Select value={viewType} onValueChange={setViewType}>
                <SelectTrigger className="w-30">
                  <SelectValue placeholder="View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-30">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {validProjects.map(project => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Calendar Grid */}
          {viewType === 'month' ? (
            <div>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center p-2 text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

            {/* Project Legend */}
            <div className="mt-6 flex flex-wrap gap-2">
              {validProjects.map(project => (
                <div key={project.id} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${getProjectColor(project.id)}`} />
                  <span className="text-sm">{project.name}</span>
                </div>
              ))}
            </div>
              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1 mt-6">
                {getDaysInMonth(selectedDate).map((date, index) => {
                  const dateStr = formatDate(date);
                  const dayData = calendarData[dateStr];
                  const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                  const isToday = formatDate(date) === formatDate(new Date());

                  return (
                    <div
                      key={index}
                      className={` p-2 border rounded ${
                        isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } ${isToday ? 'border-blue-500' : ''}`}
                    >
                      <div className={`text-sm mb-1 ${
                        isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {date.getDate()}
                        {dayData && (
                          <span className="ml-1 text-xs text-gray-500">
                            ({dayData.total.toFixed(1)}h)
                          </span>
                        )}
                      </div>
                      {dayData && (
                        <div className="space-y-1">
                          {Object.values(dayData.byProject).map((project, i) => (
                            <div
                              key={i}
                              className={`text-xs p-1 rounded text-white ${project.color}`}
                              title={`${project.name}: ${project.hours.toFixed(1)} hours`}
                            >
                              {project.hours.toFixed(1)}h
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
              
          ) : (
            // Weekly View
            <div className="space-y-4">
              {getWeeksInView().map((weekStart, index) => {
                const weekKey = formatDate(weekStart);
                const weekData = calendarData[weekKey];
                
                return (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">
                          Week of {weekStart.toLocaleDateString()}
                        </h4>
                        {weekData && (
                          <p className="text-sm text-gray-500">
                            Total: {weekData.total.toFixed(1)} hours
                          </p>
                        )}
                      </div>
                      {weekData && (
                        <div className="space-y-2">
                          {Object.values(weekData.byProject).map((project, i) => (
                            <div
                              key={i}
                              className={`text-sm p-2 rounded text-white ${project.color}`}
                            >
                              {project.name}: {project.hours.toFixed(1)}h
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Line Chart */}
      <div>
        <div className='bg-white p-4 rounded shadow'>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Time Trend</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    label={{ 
                      value: 'Hours', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle' }
                    }}
                  />
                  <Tooltip />
                  <Legend />
                  {selectedProject === 'all' ? (
                    // Show all projects when no filter
                    validProjects.map((project, index) => (
                      <Line
                        key={project.id}
                        type="monotone"
                        dataKey={project.name}
                        stroke={`hsl(${(index * 360) / validProjects.length}, 70%, 50%)`}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))
                  ) : (
                    // Show only total when filtered
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      dot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
