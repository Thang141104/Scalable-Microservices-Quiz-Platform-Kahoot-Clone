import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiPlus, FiTrash2, FiImage } from 'react-icons/fi';
import API_URLS from '../config/api';
import './QuizBuilder.css';

const QuizBuilder = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get quiz ID from URL for edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [quiz, setQuiz] = useState({
    title: 'Untitled Quiz',
    description: '',
    visibility: 'Public',
    language: 'English'
  });

  const [questions, setQuestions] = useState([
    {
      id: 1,
      type: 'Single Choice',
      title: 'Capital of Vietnam?',
      timeLimit: 20,
      points: 1000,
      options: ['Hanoi', 'Ho Chi Minh City', 'Da Nang', 'Hue'],
      correctAnswer: 0,
      media: null
    },
    {
      id: 2,
      type: 'True/False',
      title: '7 is a prime number',
      timeLimit: 15,
      points: 800,
      options: ['True', 'False'],
      correctAnswer: 0,
      media: null
    },
    {
      id: 3,
      type: 'Multiple Choice',
      title: 'Pick prime numbers',
      timeLimit: 25,
      points: 1200,
      options: ['2', '3', '4', '5'],
      correctAnswer: [0, 1, 3],
      media: null
    }
  ]);

  const [selectedQuestion, setSelectedQuestion] = useState(0);

  // Load quiz data if in edit mode
  useEffect(() => {
    if (id) {
      setIsEditMode(true);
      loadQuizData(id);
    }
  }, [id]);

  const loadQuizData = async (quizId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(API_URLS.QUIZ_BY_ID(quizId), {
        headers: headers
      });
      const data = await response.json();
      
      if (response.ok) {
        setQuiz({
          title: data.title,
          description: data.description || '',
          visibility: data.visibility || 'Public',
          language: data.language || 'English'
        });
        
        // Map questions to match the format
        const mappedQuestions = data.questions.map((q, idx) => ({
          id: idx + 1,
          type: q.type,
          title: q.title,
          timeLimit: q.timeLimit,
          points: q.points,
          options: q.options,
          correctAnswer: q.correctAnswer,
          media: q.media
        }));
        
        setQuestions(mappedQuestions);
        console.log('✅ Quiz loaded for editing:', data.title);
      } else {
        alert('Failed to load quiz');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      alert('Error loading quiz');
      navigate('/dashboard');
    }
  };

  const handleSaveQuiz = async () => {
    try {
      // Get logged-in user
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user || !user.id) {
        alert('Please login to save quiz');
        navigate('/login');
        return;
      }

      // Validate quiz data
      if (!quiz.title || quiz.title.trim() === '') {
        alert('Please enter a quiz title');
        return;
      }

      if (questions.length === 0) {
        alert('Please add at least one question');
        return;
      }

      // Validate each question
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        
        // Check title
        if (!q.title || q.title.trim() === '') {
          alert(`Question ${i + 1}: Please enter a question title`);
          return;
        }
        
        // Check options count based on type
        let requiredOptions, maxOptions;
        if (q.type === 'True/False') {
          requiredOptions = 2;
          maxOptions = 2;
        } else if (q.type === 'Single Choice') {
          requiredOptions = 2;
          maxOptions = 4;
        } else if (q.type === 'Multiple Choice') {
          requiredOptions = 2;
          maxOptions = 7;
        } else {
          requiredOptions = 2;
          maxOptions = 6;
        }
        
        if (q.options.length < requiredOptions) {
          alert(`Question ${i + 1}: ${q.type} requires at least ${requiredOptions} options`);
          return;
        }
        
        if (q.options.length > maxOptions) {
          alert(`Question ${i + 1}: ${q.type} can have maximum ${maxOptions} options`);
          return;
        }
        
        // Check all options have text
        const emptyOptions = q.options.filter(opt => !opt || opt.trim() === '');
        if (emptyOptions.length > 0) {
          alert(`Question ${i + 1}: All options must have text`);
          return;
        }
        
        // Check correctAnswer is valid
        if (q.type === 'Multiple Choice') {
          if (!Array.isArray(q.correctAnswer) || q.correctAnswer.length === 0) {
            alert(`Question ${i + 1}: Please select at least one correct answer`);
            return;
          }
          // Check all indexes are valid
          const invalidIndexes = q.correctAnswer.filter(idx => idx >= q.options.length);
          if (invalidIndexes.length > 0) {
            alert(`Question ${i + 1}: Invalid correct answer indexes`);
            return;
          }
        } else {
          if (q.correctAnswer === undefined || q.correctAnswer === null) {
            alert(`Question ${i + 1}: Please select a correct answer`);
            return;
          }
          if (q.correctAnswer >= q.options.length) {
            alert(`Question ${i + 1}: Invalid correct answer index`);
            return;
          }
        }
      }

      // Prepare quiz data
      const quizData = {
        title: quiz.title,
        description: quiz.description || '',
        createdBy: user.id, // Use real user ID
        questions: questions.map(q => ({
          type: q.type, // Keep original: 'Single Choice', 'True/False', etc.
          title: q.title,
          timeLimit: q.timeLimit,
          points: q.points,
          options: q.options,
          correctAnswer: q.correctAnswer
        }))
      };

      console.log('Saving quiz:', quizData);

      // Send to backend - use PUT for edit, POST for create
      const url = isEditMode 
        ? API_URLS.QUIZ_BY_ID(id)
        : API_URLS.QUIZZES;
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, {
        method: method,
        headers: headers,
        body: JSON.stringify(quizData)
      });

      const data = await response.json();

      if (response.ok) {
        alert(isEditMode ? 'Quiz updated successfully!' : 'Quiz saved successfully!');
        navigate('/dashboard');
      } else {
        console.error('Server error:', data);
        alert(`Failed to save quiz: ${data.error || data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving quiz:', error);
      alert('Network error. Please check if Quiz Service is running on port 3002');
    }
  };

  const addQuestion = () => {
    const newQuestion = {
      id: questions.length + 1,
      type: 'Single Choice',
      title: '',
      timeLimit: 20,
      points: 1000,
      options: ['', '', '', ''],
      correctAnswer: 0,
      media: null
    };
    setQuestions([...questions, newQuestion]);
    setSelectedQuestion(questions.length);
  };

  const updateQuestion = (field, value) => {
    const updated = [...questions];
    const currentQuestion = updated[selectedQuestion];
    
    // Special handling for type change
    if (field === 'type') {
      const oldType = currentQuestion.type;
      const newType = value;
      
      // Adjust options and correctAnswer when changing type
      if (newType === 'True/False') {
        // True/False needs exactly 2 options
        if (currentQuestion.options.length > 2) {
          if (confirm('True/False questions can only have 2 options. Extra options will be removed. Continue?')) {
            currentQuestion.options = currentQuestion.options.slice(0, 2);
            // Reset correctAnswer if it's out of range
            if (currentQuestion.correctAnswer > 1) {
              currentQuestion.correctAnswer = 0;
            }
          } else {
            return; // Cancel type change
          }
        } else if (currentQuestion.options.length < 2) {
          // Add missing options
          while (currentQuestion.options.length < 2) {
            currentQuestion.options.push('');
          }
        }
      } else if (newType === 'Single Choice') {
        // Single Choice max 4 options
        if (currentQuestion.options.length > 4) {
          if (confirm('Single Choice questions can only have 4 options. Extra options will be removed. Continue?')) {
            currentQuestion.options = currentQuestion.options.slice(0, 4);
            // Reset correctAnswer if it's out of range
            if (Array.isArray(currentQuestion.correctAnswer)) {
              currentQuestion.correctAnswer = currentQuestion.correctAnswer.filter(idx => idx < 4);
            } else if (currentQuestion.correctAnswer > 3) {
              currentQuestion.correctAnswer = 0;
            }
          } else {
            return; // Cancel type change
          }
        }
        
        // Convert correctAnswer from array to single value
        if (Array.isArray(currentQuestion.correctAnswer)) {
          currentQuestion.correctAnswer = currentQuestion.correctAnswer[0] || 0;
        }
      } else if (newType === 'Multiple Choice') {
        // Multiple Choice max 7 options
        if (currentQuestion.options.length > 7) {
          if (confirm('Multiple Choice questions can have up to 7 options. Extra options will be removed. Continue?')) {
            currentQuestion.options = currentQuestion.options.slice(0, 7);
            // Reset correctAnswer if it's out of range
            if (Array.isArray(currentQuestion.correctAnswer)) {
              currentQuestion.correctAnswer = currentQuestion.correctAnswer.filter(idx => idx < 7);
            } else if (currentQuestion.correctAnswer > 6) {
              currentQuestion.correctAnswer = 0;
            }
          } else {
            return; // Cancel type change
          }
        }
        
        // Convert correctAnswer from single value to array
        if (!Array.isArray(currentQuestion.correctAnswer)) {
          currentQuestion.correctAnswer = [currentQuestion.correctAnswer];
        }
      }
    }
    
    updated[selectedQuestion] = {
      ...currentQuestion,
      [field]: value
    };
    setQuestions(updated);
  };

  const deleteQuestion = (index) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    if (selectedQuestion >= updated.length) {
      setSelectedQuestion(Math.max(0, updated.length - 1));
    }
  };

  const updateOption = (optionIndex, value) => {
    const updated = [...questions];
    updated[selectedQuestion].options[optionIndex] = value;
    setQuestions(updated);
  };

  const addOption = () => {
    const currentQuestion = questions[selectedQuestion];
    const currentOptionsCount = currentQuestion.options.length;
    
    // Validation based on question type
    let maxOptions;
    if (currentQuestion.type === 'True/False') {
      maxOptions = 2;
    } else if (currentQuestion.type === 'Single Choice') {
      maxOptions = 4;
    } else if (currentQuestion.type === 'Multiple Choice') {
      maxOptions = 7; // Allow up to 7 options for Multiple Choice
    } else {
      maxOptions = 6; // Default max
    }
    
    if (currentOptionsCount >= maxOptions) {
      alert(`Maximum ${maxOptions} options allowed for ${currentQuestion.type} questions`);
      return;
    }
    
    const updated = [...questions];
    updated[selectedQuestion].options.push('');
    setQuestions(updated);
  };

  const currentQ = questions[selectedQuestion];

  return (
    <div className="quiz-builder-container">
      <header className="builder-header">
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-back" onClick={() => navigate('/')}>
            🏠 Home
          </button>
          <button className="btn-back" onClick={() => navigate('/dashboard')}>
            <FiArrowLeft /> Back to Dashboard
          </button>
        </div>
        <div className="header-title">
          <h2>{isEditMode ? 'Edit Quiz' : 'Create New Quiz'}</h2>
          <span className="question-count">{questions.length} questions</span>
        </div>
        <button className="btn-save" onClick={handleSaveQuiz}>
          <FiSave /> {isEditMode ? 'Update Quiz' : 'Save Quiz'}
        </button>
      </header>

      <div className="builder-layout">
        <aside className="quiz-settings">
          <h3>Quiz Settings</h3>
          
          <div className="form-group">
            <label>Quiz Title</label>
            <input
              type="text"
              value={quiz.title}
              onChange={(e) => setQuiz({...quiz, title: e.target.value})}
              placeholder="Enter quiz title"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={quiz.description}
              onChange={(e) => setQuiz({...quiz, description: e.target.value})}
              placeholder="Add a description..."
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Visibility</label>
              <select 
                value={quiz.visibility}
                onChange={(e) => setQuiz({...quiz, visibility: e.target.value})}
              >
                <option>Public</option>
                <option>Private</option>
              </select>
            </div>

            <div className="form-group">
              <label>Language</label>
              <select 
                value={quiz.language}
                onChange={(e) => setQuiz({...quiz, language: e.target.value})}
              >
                <option>English</option>
                <option>Vietnamese</option>
              </select>
            </div>
          </div>

          <div className="questions-list">
            <h4>Questions</h4>
            {questions.map((q, index) => (
              <div 
                key={q.id}
                className={`question-item ${index === selectedQuestion ? 'active' : ''}`}
                onClick={() => setSelectedQuestion(index)}
              >
                <div className="question-info">
                  <span className="question-label">Q{index + 1}</span>
                  <span className="question-type">{q.type}</span>
                </div>
                <div className="question-meta">
                  <span>{q.timeLimit}s</span>
                  <span>{q.points} pts</span>
                  <span>{q.options.length} options</span>
                </div>
                <button 
                  className="btn-delete-question"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteQuestion(index);
                  }}
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
            <button className="btn-add-question" onClick={addQuestion}>
              <FiPlus /> Add Question
            </button>
          </div>
        </aside>

        <main className="question-editor">
          <h3>Question Editor</h3>
          
          {currentQ && (
            <>
              <div className="form-group">
                <label>Question Title</label>
                <input
                  type="text"
                  value={currentQ.title}
                  onChange={(e) => updateQuestion('title', e.target.value)}
                  placeholder="Enter your question"
                />
              </div>

              <div className="form-group">
                <label>Question Type</label>
                <select 
                  value={currentQ.type}
                  onChange={(e) => updateQuestion('type', e.target.value)}
                >
                  <option>Single Choice</option>
                  <option>Multiple Choice</option>
                  <option>True/False</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Time Limit (seconds)</label>
                  <input
                    type="number"
                    value={currentQ.timeLimit}
                    onChange={(e) => updateQuestion('timeLimit', parseInt(e.target.value))}
                    min="5"
                    max="120"
                  />
                </div>

                <div className="form-group">
                  <label>Points</label>
                  <input
                    type="number"
                    value={currentQ.points}
                    onChange={(e) => updateQuestion('points', parseInt(e.target.value))}
                    min="100"
                    max="5000"
                    step="100"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Answer Options</label>
                <div className="options-list">
                  {currentQ.options.map((option, index) => (
                    <div key={index} className="option-item">
                      <input
                        type={currentQ.type === 'Multiple Choice' ? 'checkbox' : 'radio'}
                        name="correct-answer"
                        checked={
                          Array.isArray(currentQ.correctAnswer) 
                            ? currentQ.correctAnswer.includes(index)
                            : currentQ.correctAnswer === index
                        }
                        onChange={() => {
                          if (currentQ.type === 'Multiple Choice') {
                            const current = Array.isArray(currentQ.correctAnswer) ? currentQ.correctAnswer : [];
                            const updated = current.includes(index)
                              ? current.filter(i => i !== index)
                              : [...current, index];
                            updateQuestion('correctAnswer', updated);
                          } else {
                            updateQuestion('correctAnswer', index);
                          }
                        }}
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      {(() => {
                        const minOptions = currentQ.type === 'True/False' ? 2 : 2;
                        const canDelete = currentQ.options.length > minOptions;
                        
                        return canDelete && (
                          <button 
                            className="btn-delete-option"
                            onClick={() => {
                              const updated = [...questions];
                              const newOptions = updated[selectedQuestion].options.filter((_, i) => i !== index);
                              
                              // Update correctAnswer if needed
                              const currentCorrectAnswer = updated[selectedQuestion].correctAnswer;
                              if (Array.isArray(currentCorrectAnswer)) {
                                // Multiple Choice: remove deleted index and adjust others
                                updated[selectedQuestion].correctAnswer = currentCorrectAnswer
                                  .filter(idx => idx !== index)
                                  .map(idx => idx > index ? idx - 1 : idx);
                              } else if (currentCorrectAnswer === index) {
                                // Single/True-False: reset if deleted correct answer
                                updated[selectedQuestion].correctAnswer = 0;
                              } else if (currentCorrectAnswer > index) {
                                // Adjust index if after deleted option
                                updated[selectedQuestion].correctAnswer = currentCorrectAnswer - 1;
                              }
                              
                              updated[selectedQuestion].options = newOptions;
                              setQuestions(updated);
                            }}
                          >
                            <FiTrash2 />
                          </button>
                        );
                      })()}
                    </div>
                  ))}
                  {(() => {
                    const maxOptions = currentQ.type === 'True/False' ? 2 : 
                                     (currentQ.type === 'Single Choice' || currentQ.type === 'Multiple Choice') ? 4 : 6;
                    const canAddMore = currentQ.options.length < maxOptions;
                    
                    return canAddMore ? (
                      <button className="btn-add-option" onClick={addOption}>
                        <FiPlus /> Add Option
                      </button>
                    ) : (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#A0AEC0', fontSize: '14px' }}>
                        Maximum {maxOptions} options for {currentQ.type}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="form-group">
                <label>
                  <input type="checkbox" />
                  Shuffle answer options
                </label>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default QuizBuilder;
