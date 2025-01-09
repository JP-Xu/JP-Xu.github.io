import React, { useState, useEffect, useCallback } from 'react';
import CalendarView from './CalendarView';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayCircle, PauseCircle, StopCircle, Timer, ArrowDownCircle, Clock } from 'lucide-react';

const ProjectTracker = () => {
  const [projects, setProjects] = useState(() => {
    const savedProjects = localStorage.getItem('projects');
    return savedProjects ? JSON.parse(savedProjects) : [];
  });
  const [newProject, setNewProject] = useState('');
  const [timeEntries, setTimeEntries] = useState(() => {
    const savedEntries = localStorage.getItem('timeEntries');
    return savedEntries ? JSON.parse(savedEntries) : [];
  });
  const [hours, setHours] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [alertMessage, setAlertMessage] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Timer states
  const [activeTimer, setActiveTimer] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [countdownDuration, setCountdownDuration] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [pausedTime, setPausedTime] = useState(0);

  useEffect(() => {
    const savedProjects = localStorage.getItem('projects');
    const savedEntries = localStorage.getItem('timeEntries');
    if (savedProjects) setProjects(JSON.parse(savedProjects));
    if (savedEntries) setTimeEntries(JSON.parse(savedEntries));
  }, []);

  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects));
    localStorage.setItem('timeEntries', JSON.stringify(timeEntries));
  }, [projects, timeEntries]);

  useEffect(() => {
    let intervalId;
    if (activeTimer && !isPaused) {
      intervalId = setInterval(() => {
        const now = Date.now();
        if (activeTimer.type === 'up') {
          setElapsedTime((now - activeTimer.startTime) + pausedTime);
        } else {
          const remaining = activeTimer.duration - ((now - activeTimer.startTime) + pausedTime);
          setElapsedTime(remaining);
          if (remaining <= 0) {
            stopTimer();
            setAlertMessage('Timer finished!');
            setShowAlert(true);
          }
        }
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTimer]);

  const formatTime = (ms) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    const hours = Math.floor(ms / 1000 / 60 / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const addTimeEntry = useCallback((projectId, hoursSpent, customDate = null) => {
    if (!projectId || !hoursSpent) return;
    
    const entryDate = customDate || new Date().toISOString().split('T')[0];
    const entry = {
      id: Date.now(),
      projectId,
      hours: hoursSpent,
      date: entryDate,
      timestamp: customDate ? `${customDate}T${new Date().toTimeString().split(' ')[0]}` : new Date().toISOString()
    };
    
    setTimeEntries(prev => [...prev, entry]);
    
    setProjects(projects => projects.map(p => {
      if (p.id === projectId) {
        return { ...p, totalHours: p.totalHours + hoursSpent };
      }
      return p;
    }));
  }, []);

  const addManualTimeEntry = () => {
    if (!selectedProject || !hours) {
      setAlertMessage('Please select a project and enter hours');
      setShowAlert(true);
      return;
    }
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      setAlertMessage('Please enter a valid number of hours');
      setShowAlert(true);
      return;
    }

    const projectName = projects.find(p => p.id === selectedProject)?.name || 'project';
    
    addTimeEntry(selectedProject, hoursNum, manualDate);
    setHours('');
    
    setAlertMessage(`Successfully recorded ${hoursNum} hours for ${projectName}`);
    setShowAlert(true);
  };

  const startTimer = (projectId, type) => {
    const project = projects.find(p => p.id === projectId);
    if (project?.status !== 'active') {
      setAlertMessage('Only active projects can use the timer');
      setShowAlert(true);
      return;
    }

    if (type === 'down' && !countdownDuration) {
      setAlertMessage('Please set a countdown duration');
      setShowAlert(true);
      return;
    }
    
    setActiveTimer({
      projectId,
      type,
      startTime: Date.now(),
      duration: type === 'down' ? countdownDuration * 60 * 1000 : null
    });
  };

  const pauseTimer = () => {
    if (!activeTimer || isPaused) return;
    setIsPaused(true);
    setPausedTime(prev => prev + (Date.now() - activeTimer.startTime));
    setActiveTimer(prev => ({
      ...prev,
      startTime: Date.now() // Reset start time for when we resume
    }));
  };

  const resumeTimer = () => {
    if (!activeTimer || !isPaused) return;
    setIsPaused(false);
    setActiveTimer(prev => ({
      ...prev,
      startTime: Date.now()
    }));
  };

  const stopTimer = () => {
    if (!activeTimer) return;
    
    if (activeTimer.type === 'up') {
      // Calculate total time including paused time
      const totalTimeMs = (Date.now() - activeTimer.startTime) + pausedTime;
      const timeSpent = totalTimeMs / (1000 * 60 * 60); // Convert to hours
      addTimeEntry(activeTimer.projectId, timeSpent);
    } else if (activeTimer.type === 'down') {
      const timeSpent = activeTimer.duration / (1000 * 60 * 60);
      addTimeEntry(activeTimer.projectId, timeSpent);
    }
    
    setActiveTimer(null);
    setElapsedTime(0);
    setCountdownDuration('');
    setIsPaused(false);
    setPausedTime(0);
  };

  const addProject = () => {
    if (!newProject.trim()) {
      setAlertMessage('Please enter a project name');
      setShowAlert(true);
      return;
    }
    const project = {
      id: Date.now(),
      name: newProject,
      status: 'active',
      totalHours: 0
    };
    setProjects([...projects, project]);
    setNewProject('');
  };

  const updateProjectStatus = (projectId, newStatus) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return { ...p, status: newStatus };
      }
      return p;
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'complete': return 'bg-green-100 text-green-800';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  return (
    <div className="w-screen min-h-screen flex flex-col ">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-500 text-white mb-6 ">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Timer className="h-7 w-7" />
              <div>
                <h1 className="text-2xl font-bold">Project Time Tracker</h1>
                <p className="text-indigo-100 text-sm">Created by Jiaming X.</p>
              </div>
            </div>
            
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-indigo-100 text-xs">Total Projects</p>
                <p className="text-xl font-bold leading-tight">{projects.length}</p>
              </div>
              <div className="text-right">
                <p className="text-indigo-100 text-xs">Active</p>
                <p className="text-xl font-bold leading-tight">
                  {projects.filter(p => p.status === 'active').length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-indigo-100 text-xs">Hours Tracked</p>
                <p className="text-xl font-bold leading-tight">
                  {projects.reduce((sum, p) => sum + p.totalHours, 0).toFixed(1)}h
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-screen px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Left Column: Projects */}
          <div className='md:col-span-2 bg-white p-4 rounded shadow'>
            {/* Add New Project */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Add New Project</h2>
              <div className="flex gap-4">
                <Input
                  type="text"
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  placeholder="Project name"
                  className="flex-1"
                />
                <Button onClick={addProject}>Add</Button>
              </div>
            </div>

            {/* Projects List with Filter */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Projects</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Filter by status:</span>
                  <Select 
                    value={statusFilter} 
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger className="w-[140px] bg-white">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects ({projects.length})</SelectItem>
                      <SelectItem value="active">
                        Active ({projects.filter(p => p.status === 'active').length})
                      </SelectItem>
                      <SelectItem value="complete">
                        Complete ({projects.filter(p => p.status === 'complete').length})
                      </SelectItem>
                      <SelectItem value="on-hold">
                        On Hold ({projects.filter(p => p.status === 'on-hold').length})
                      </SelectItem>
                      <SelectItem value="cancelled">
                        Cancelled ({projects.filter(p => p.status === 'cancelled').length})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3">
                {projects
                  .filter(project => statusFilter === 'all' || project.status === statusFilter)
                  .map(project => (
                  <Card 
                    key={project.id} 
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedProject === project.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedProject(project.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{project.name}</h3>
                        <p className="text-sm text-gray-600">Total: {project.totalHours.toFixed(2)}h</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                        <Select 
                          defaultValue={project.status}
                          onValueChange={(value) => updateProjectStatus(project.id, value)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="complete">Complete</SelectItem>
                            <SelectItem value="on-hold">On Hold</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Time Entry */}
          <div className='md:col-span-2 bg-white p-4 rounded shadow'>
            <h2 className="text-xl font-semibold mb-4">Add Time</h2>
            {selectedProjectData ? (
              <Card className="p-4">
                <h3 className="font-medium mb-4">
                  Adding time to: {selectedProjectData.name}
                </h3>

                {/* Manual Time Entry */}
                <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Manual Entry:</span>
                    </div>
                    <div className="flex gap-2 flex-1">
                      <Input
                        type="number"
                        value={hours}
                        onChange={(e) => setHours(e.target.value)}
                        placeholder="Hours"
                        className="w-20"
                        step="0.5"
                      />
                      <Input
                        type="date"
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                        className="w-36"
                        max={new Date().toISOString().split('T')[0]}
                      />
                      <Button onClick={addManualTimeEntry} className="whitespace-nowrap">
                        Record Time
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Timer Controls */}
                <div className="mt-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Timer:</span>
                    </div>
                    
                    {selectedProjectData.status === 'active' ? (
                      activeTimer?.projectId === selectedProject ? (
                        <div className="flex items-center gap-4 flex-1">
                          <div className="text-lg font-mono">
                            {formatTime(elapsedTime)}
                          </div>
                          <div className="flex gap-2">
                            {isPaused ? (
                              <Button variant="outline" size="icon" onClick={resumeTimer}>
                                <PlayCircle className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button variant="outline" size="icon" onClick={pauseTimer}>
                                <PauseCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="outline" size="icon" onClick={stopTimer}>
                              <StopCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3 flex-1">
                          {/* Count Up Timer */}
                          <div className="flex items-center gap-2 rounded-md border px-2 py-1.5 bg-white">
                            <span className="text-sm text-gray-600 whitespace-nowrap">Count Up:</span>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex gap-1"
                              onClick={() => startTimer(selectedProject, 'up')}
                            >
                              <Timer className="h-3.5 w-3.5" />
                              Start
                            </Button>
                          </div>

                          {/* Count Down Timer */}
                          <div className="flex items-center gap-2 rounded-md border px-2 py-1.5 bg-white">
                            <span className="text-sm text-gray-600 whitespace-nowrap">Count Down:</span>
                            <Input
                              type="number"
                              placeholder="Min"
                              className="w-16"
                              value={countdownDuration}
                              onChange={(e) => setCountdownDuration(e.target.value)}
                            />
                            <Button 
                              variant="outline"
                              size="sm"
                              className="flex gap-1"
                              onClick={() => startTimer(selectedProject, 'down')}
                            >
                              <ArrowDownCircle className="h-3.5 w-3.5" />
                              Start
                            </Button>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="text-sm text-muted-foreground italic flex-1">
                        Timer is only available for active projects
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-4 text-center text-gray-500">
                Select a project to add time
              </Card>
            )}
          </div>
        </div>

        {/* Recent Time Entries */}
        <div className="mt-8  bg-white py-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-4 px-6">Recent Time Entries</h2>
          <div className="grid gap-2 px-6">
            {timeEntries.slice(-5).reverse().map(entry => {
              const project = projects.find(p => p.id === entry.projectId);
              return (
                <div key={entry.id} className="p-2 bg-gray-50 rounded">
                  <p className="text-sm">
                    {project?.name} - {entry.hours.toFixed(2)} hours on {entry.date}
                    <span className="text-gray-500 ml-2">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Calendar View */}
        <CalendarView projects={projects} timeEntries={timeEntries} />
      </div>

      {/* Floating Timer */}
      {activeTimer && (
        <div className="fixed bottom-6 right-6 bg-white border shadow-lg rounded-lg p-4 flex items-center gap-4 z-50">
          <div>
            <div className="text-sm text-gray-500 mb-1">
              {projects.find(p => p.id === activeTimer.projectId)?.name}
            </div>
            <div className="text-2xl font-mono font-bold">
              {formatTime(elapsedTime)}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {isPaused ? (
              <Button variant="outline" size="icon" onClick={resumeTimer} className="h-8 w-8">
                <PlayCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="outline" size="icon" onClick={pauseTimer} className="h-8 w-8">
                <PauseCircle className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={stopTimer} className="h-8 w-8">
              <StopCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Alert Dialog */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Notice</AlertDialogTitle>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowAlert(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectTracker;