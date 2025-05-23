import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  useTheme,
  Avatar,
  Stack,
  Tabs,
  Tab,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  TextField,
} from "@mui/material";
import Chart from "react-apexcharts";
import ErrorBoundary from '../utils/ErrorBoundary.js'
import api from "../utils/api";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from "@mui/lab";
import {
  FilterList,
  Refresh,
  Today,
  PieChart,
  ShowChart,
  TableChart,
  Person,
  Delete,
  Description,
  People,
  AccessTime,
  InfoOutlined,
} from "@mui/icons-material";
import { format } from "date-fns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import LoadingScreen from "../components/common/LoadingScreen";

const validateDateRange = (start, end) => {
  const now = new Date();
  const minDate = new Date(2025, 0, 1); // Adjust to your system's earliest date

  if (start > end) return "Start date must be before end date";
  if (end > now) return "End date cannot be in the future";
  if (start < minDate)
    return `Date range cannot be before ${format(minDate, "MMM yyyy")}`;
  return null;
};

const safeRenderChart = (options, series, type, height, fetchAnalyticsData, setDateRange) => {
  try {
    if (!options || !series || series.length === 0) {
      return (
        <Box textAlign="center" py={4}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            No data available for the selected date range and filters.
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Try adjusting the date range or filters to find relevant data.
          </Typography>
          <Box mt={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={fetchAnalyticsData}
              startIcon={<Refresh />}
              sx={{ mr: 1 }}
            >
              Reload Data
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setDateRange({ start: new Date(), end: new Date() })}
            >
              Reset Filters
            </Button>
          </Box>
        </Box>
      );
    }
    return (
      <Chart
        options={options}
        series={series}
        type={type}
        height={height}
        key={`chart-${type}-${series.length}`}
      />
    );
  } catch (error) {
    console.error("Chart rendering error:", error);
    return (
      <Typography variant="body2" color="error">
        Chart rendering failed
      </Typography>
    );
  }
};

const AnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("chart");
  const [filter, setFilter] = useState({
    timeRange: "today",
    reportType: "all",
    reportSubtype: "all",
  });

  const [detailsDialog, setDetailsDialog] = useState({
    open: false,
    data: null,
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date(),
  });

  const fetchAnalyticsData = async () => {
    try {
      const validationError = validateDateRange(dateRange.start, dateRange.end);
      if (validationError) {
        setError(validationError);
        return;
      }

      setLoading(true);
      setError(null);

      const params = {
        startDate: format(dateRange.start, "yyyy-MM-dd"),
        endDate: format(dateRange.end, "yyyy-MM-dd"),
      };

      const response = await api.get("/analytics", { params });
      setAnalyticsData({
        ...response.data,
        reportTypeDistribution: response.data.reportTypeStats || [],
        dateRangeReports: response.data.dateRangeReports || [],
        dateRangeUsed: response.data.dateRangeUsed || {
          start: params.startDate,
          end: params.endDate,
        },
      });
    } catch (err) {
      console.error("Error fetching analytics data:", err);
      setError(
        err.response?.data?.message || "Failed to fetch analytics data."
      );
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const handleReload = () => {
    setError(null); // Reset error state
    fetchAnalyticsData(); // Reload data
  };

  useEffect(() => {
    return () => {
      if (window.apexChartInstances) {
        window.apexChartInstances.forEach(chart => {
          if (chart && chart.destroy) {
            chart.destroy();
          }
        });
      }
    };
  }, []);

  const handleExportCSV = () => {
    if (!analyticsData?.dateRangeReports) return;

    const csvContent = [
      ["Report Type", "Count", "Unique Patients"],
      ...analyticsData.dateRangeReports.map((r) => [
        r.report_type,
        r.count,
        r.unique_patients,
      ]),
    ]
      .map((e) => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `reports_${format(new Date(), "yyyyMMdd")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderDateRangeFilter = () => (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={5} md={3} mt={3}>
          <DatePicker
            label="Start Date"
            value={dateRange.start}
            onChange={(newValue) =>
              setDateRange((prev) => ({ ...prev, start: newValue }))
            }
            renderInput={(params) => (
              <TextField {...params} fullWidth size="small" />
            )}
            maxDate={dateRange.end}
          />
        </Grid>
        <Grid item xs={12} sm={5} md={3} mt={3}>
          <DatePicker
            label="End Date"
            value={dateRange.end}
            onChange={(newValue) =>
              setDateRange((prev) => ({ ...prev, end: newValue }))
            }
            renderInput={(params) => (
              <TextField {...params} fullWidth size="small" />
            )}
            minDate={dateRange.start}
            maxDate={new Date()}
          />
        </Grid>
        <Grid item xs={12} sm={2} md={1}>
          <Button
            variant="contained"
            onClick={fetchAnalyticsData}
            fullWidth
            disabled={loading}
            startIcon={
              loading ? (
                <LoadingScreen message="Applying Date" />
              ) : (
                <FilterList />
              )
            }
          >
            {loading ? "Applying..." : "Apply"}
          </Button>
        </Grid>
        <Grid item xs={12} sm={12} md={5}>
          <Box display="flex" gap={1} flexWrap="wrap">
            <Button
              size="small"
              sx={quickDateButtonStyle}
              onClick={() => {
                setDateRange({
                  start: new Date(),
                  end: new Date(),
                });
              }}
            >
              Today
            </Button>
            <Button
              size="small"
              sx={quickDateButtonStyle}
              onClick={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                setDateRange({
                  start: yesterday,
                  end: yesterday,
                });
              }}
            >
              Yesterday
            </Button>
            <Button
              size="small"
              sx={quickDateButtonStyle}
              onClick={() => {
                setDateRange({
                  start: new Date(new Date().setDate(new Date().getDate() - 1)),
                  end: new Date(),
                });
              }}
            >
              Last 24 Hours
            </Button>
            <Button
              size="small"
              sx={quickDateButtonStyle}
              onClick={() => {
                setDateRange({
                  start: new Date(new Date().setDate(new Date().getDate() - 7)),
                  end: new Date(),
                });
              }}
            >
              Last 7 Days
            </Button>
            <Button
              size="small"
              sx={quickDateButtonStyle}
              onClick={() => {
                setDateRange({
                  start: new Date(new Date().setDate(new Date().getDate() - 30)),
                  end: new Date(),
                });
              }}
            >
              Last 30 Days
            </Button>
            <Button
              size="small"
              sx={quickDateButtonStyle}
              onClick={() => {
                setDateRange({
                  start: new Date(new Date().getFullYear(), 0, 1),
                  end: new Date(),
                });
              }}
            >
              This Year
            </Button>
          </Box>
        </Grid>
      </Grid>
    </LocalizationProvider>
  );

  const handleTabChange = (event, newValue) => {
    if (window.apexChartInstances) {
      window.apexChartInstances.forEach(chart => {
        if (chart && chart.destroy) {
          chart.destroy();
        }
      });
      window.apexChartInstances = [];
    }
    setActiveTab(newValue);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  const handleFilterChange = (field, value) => {
    setFilter((prev) => ({ ...prev, [field]: value }));
  };

  const openDetailsDialog = (data) => {
    setDetailsDialog({ open: true, data });
  };

  const closeDetailsDialog = () => {
    setDetailsDialog({ open: false, data: null });
  };

  const processReportTypeData = () => {
    if (!analyticsData?.reportTypeStats) {
      return {};
    }

    const mainTypes = {};
    analyticsData.reportTypeDistribution.forEach((item) => {
      if (!mainTypes[item.report_type]) {
        mainTypes[item.report_type] = {
          count: 0,
          subtypes: [],
        };
      }
      mainTypes[item.report_type].count += item.count;
      if (item.report_subtype) {
        mainTypes[item.report_type].subtypes.push({
          name: item.report_subtype,
          count: item.count,
        });
      }
    });
    return mainTypes;
  };

  const reportTypeHierarchy = processReportTypeData();

  if (loading) {
    return <LoadingScreen message="Fetching Data ..." />;
  }

  if (error) {
    return (
      <Box textAlign="center" py={10}>
        <Typography variant="h6" color="error">
          {error}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleReload}
          startIcon={<Refresh />}
          sx={{ mt: 2 }}
        >
          Reload Data
        </Button>
      </Box>
    );
  }

  if (!analyticsData || !analyticsData.reportTypeDistribution) {
    return (
      <Box textAlign="center" py={10}>
        <Typography variant="h6" color="error">
          Failed to load analytics data. Please try again later.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={fetchAnalyticsData}
          startIcon={<Refresh />}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  const filteredTodaysReports =
    analyticsData?.todaysReports?.filter(
      (report) =>
        filter.reportType === "all" || report.report_type === filter.reportType
    ) || [];

  const filteredDateRangeReports =
    analyticsData?.dateRangeReports?.filter(
      (report) =>
        filter.reportType === "all" || report.report_type === filter.reportType
    ) || [];

  const generateColors = (count) => {
    const baseColors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.error.main,
      theme.palette.warning.main,
    ];
    return Array.from(
      { length: count },
      (_, i) => baseColors[i % baseColors.length]
    );
  };

  const chartColors = generateColors(filteredTodaysReports.length);

  const reportTypeOptions = {
    chart: {
      type: "donut",
      foreColor: theme.palette.text.primary,
    },
    labels: Object.keys(reportTypeHierarchy),
    colors: chartColors,
    legend: {
      position: "right",
    },
    dataLabels: {
      enabled: true,
      formatter: function (val) {
        return Math.round(val) + "%";
      },
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total Reports",
              color: theme.palette.text.primary,
              formatter: function (w) {
                return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
              },
            },
          },
        },
      },
    },
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            width: 200,
          },
          legend: {
            position: "bottom",
          },
        },
      },
    ],
  };

  const reportTypeSeries = Object.values(reportTypeHierarchy).map(
    (type) => type.count
  );

  const quickDateButtonStyle = {
    "&.MuiButton-root": {
      padding: "4px 8px",
      fontSize: "0.75rem",
      minWidth: "unset",
    },
  };

  const monthlyTrendsOptions = {
    chart: {
      type: "line",
      foreColor: theme.palette.text.primary,
      toolbar: {
        show: true,
      },
    },
    stroke: {
      curve: "smooth",
      width: [3, 3, 3],
    },
    colors: chartColors, // Use chartColors here
    xaxis: {
      categories: analyticsData.monthlyTrends.map((data) => data.month),
    },
    yaxis: {
      title: {
        text: "Count",
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
    },
    legend: {
      position: "top",
    },
  };

  const monthlyTrendsSeries = [
    {
      name: "Uploads",
      data: analyticsData.monthlyTrends.map((data) => data.total_uploads) || [],
    },
    {
      name: "Deletions",
      data: analyticsData.monthlyTrends.map((data) => data.deletions) || [],
    },
    {
      name: "Unique Patients",
      data:
        analyticsData.monthlyTrends.map((data) => data.unique_patients) || [],
    },
    {
      name: "Active Uploaders",
      data:
        analyticsData.monthlyTrends.map((data) => data.active_uploaders) || [],
    },
  ];

  const dailyActivityOptions = {
    chart: {
      type: "bar",
      foreColor: theme.palette.text.primary,
      stacked: true,
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 4,
      },
    },
    colors: chartColors,
    xaxis: {
      categories: analyticsData.dailyActivity.map((data) =>
        format(new Date(data.date), "MMM dd")
      ),
    },
    yaxis: {
      title: {
        text: "Count",
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
    },
    legend: {
      position: "top",
    },
  };

  const dailyActivitySeries = [
    {
      name: "Uploads",
      data: analyticsData.dailyActivity.map((data) => data.uploads),
    },
    {
      name: "Deletions",
      data: analyticsData.dailyActivity.map((data) => data.deletions),
    },
  ];

  // Filter today's reports by type/subtype

  const renderDateRangeReports = () => {
    const rangeStart =
      analyticsData?.dateRangeUsed?.start ||
      format(dateRange.start, "yyyy-MM-dd");
    const rangeEnd =
      analyticsData?.dateRangeUsed?.end || format(dateRange.end, "yyyy-MM-dd");
    return (
      <Card elevation={3} sx={{ mb: 4 }}>
        <CardContent>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
            flexWrap="wrap"
          >
            <Typography variant="h6" sx={{ mb: { xs: 2, sm: 0 } }}>
              Reports Analysis ({format(new Date(rangeStart), "MMM dd, yyyy")} -{" "}
              {format(new Date(rangeEnd), "MMM dd, yyyy")})
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              {renderDateRangeFilter()}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={filter.reportType}
                  onChange={(e) =>
                    handleFilterChange("reportType", e.target.value)
                  }
                  label="Report Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  {Object.keys(reportTypeHierarchy).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {viewMode === "chart" ? (
            <ErrorBoundary>
              {safeRenderChart(
                {
                  ...reportTypeOptions,
                  labels: filteredDateRangeReports.map((r) => r.report_type),
                  colors: chartColors,
                },
                filteredDateRangeReports.map((r) => r.count),
                "donut",
                 300,
                 fetchAnalyticsData,
                 setDateRange
              )}
            </ErrorBoundary>
          ) : filteredDateRangeReports.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                No data available for the selected date range and filters.
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Try adjusting the date range or filters to find relevant data.
              </Typography>
              <Box mt={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={fetchAnalyticsData}
                  startIcon={<Refresh />}
                  sx={{ mr: 1 }}
                >
                  Reload Data
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => setDateRange({ start: new Date(), end: new Date() })}
                >
                  Reset Filters
                </Button>
              </Box>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Report Type</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell align="right">Unique Patients</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDateRangeReports.map((report, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip
                          label={report.report_type}
                          color="primary"
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">{report.count}</TableCell>
                      <TableCell align="right">
                        {report.unique_patients}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => openDetailsDialog(report)}
                            aria-label="View report details"
                          >
                            <Description fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>{" "}
                {/* Properly closed TableBody */}
              </Table>{" "}
              {/* Properly closed Table */}
            </TableContainer>
          )}

          <Box display="flex" justifyContent="flex-end" mt={2}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleExportCSV}
              sx={{ mr: 1 }}
              startIcon={<Description fontSize="small" />}
            >
              Export CSV
            </Button>
            <Button
              variant={viewMode === "chart" ? "contained" : "outlined"}
              size="small"
              startIcon={<PieChart fontSize="small" />}
              onClick={() => handleViewModeChange("chart")}
              sx={{ mr: 1 }}
            >
              Chart
            </Button>
            <Button
              variant={viewMode === "table" ? "contained" : "outlined"}
              size="small"
              startIcon={<TableChart />}
              onClick={() => handleViewModeChange("table")}
            >
              Table
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Typography variant="h4">Medical Reports Analytics</Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchAnalyticsData}
        >
          Refresh Data
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: theme.palette.primary.light }}>
                  <Description />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Total Reports
                  </Typography>
                  <Typography variant="h4">
                    {analyticsData.summaryStats.totalReports}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: theme.palette.success.light }}>
                  <People />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Unique Patients
                  </Typography>
                  <Typography variant="h4">
                    {analyticsData.summaryStats.totalUniquePatients}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: theme.palette.warning.light }}>
                  <Today />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Today's Uploads
                  </Typography>
                  <Typography variant="h4">
                    {analyticsData.summaryStats.todaysUploads}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={3}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ bgcolor: theme.palette.error.light }}>
                  <Delete />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Deletion Rate
                  </Typography>
                  <Typography variant="h4">
                    {Math.round(analyticsData.summaryStats.deletionRate)}%
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {renderDateRangeReports()}

      {/* Main Analytics Tabs */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        <Tab label="Trends" icon={<ShowChart />} />
        <Tab label="Report Types" icon={<PieChart />} />
        <Tab label="Contributors" icon={<Person />} />
        <Tab label="Deletions" icon={<Delete />} />
        <Tab label="Recent Activity" icon={<AccessTime />} />
      </Tabs>

      {activeTab === 0 && (
        <Box sx={{ width: "100%" }}>
          <Grid container spacing={4}>
            {/* Monthly Trends - Full Width */}
            <Grid
              item
              xs={12}
              sx={{
                width: "100%",
              }}
            >
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Monthly Trends
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <ErrorBoundary>
                  <Chart
                    options={monthlyTrendsOptions}
                    series={monthlyTrendsSeries}
                    type="line"
                    height={350}
                    width="100%"
                    key={`chart-${activeTab}-${viewMode}`}
                  />
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </Grid>
            Last 7 Days
            {/* Daily Activity - Full Width */}
            <Grid
              item
              xs={12}
              sx={{
                width: "100%",
              }}
            >
              {" "}
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Daily Activity
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <ErrorBoundary>
                  {dailyActivityOptions && (
                  <Chart
                    options={dailyActivityOptions}
                    series={dailyActivitySeries}
                    type="bar"
                    height={350}
                    width="100%"
                    key={`chart-${activeTab}-${viewMode}`}
                  />
                  )}
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {activeTab === 1 && (
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Report Type Distribution
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <ErrorBoundary>
                  {reportTypeOptions && (
                    <Chart
                    options={reportTypeOptions}
                    series={reportTypeSeries}
                    type="donut"
                    height={350}
                    key={`chart-${activeTab}-${viewMode}`}
                  />
                  )}
                </ErrorBoundary>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Report Subtypes Analysis
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer component={Paper} elevation={0}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Subtype</TableCell>
                        <TableCell align="right">Reports</TableCell>
                        <TableCell align="right">Patients</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analyticsData.reportTypeDistribution.map(
                        (item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Chip
                                label={item.report_type}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              {item.report_subtype || "N/A"}
                            </TableCell>
                            <TableCell align="right">{item.count}</TableCell>
                            <TableCell align="right">
                              {item.unique_patients}
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Contributors
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer component={Paper} elevation={0}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User ID</TableCell>
                        <TableCell align="right">Reports Uploaded</TableCell>
                        <TableCell align="right">Unique Patients</TableCell>
                        <TableCell align="right">Report Types</TableCell>
                        {/* <TableCell align="center">Actions</TableCell> */}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analyticsData.topContributors.map((user) => (
                        <TableRow key={user.user_id}>
                          <TableCell>
                            <Chip
                              label={`User ${user.user_id}`}
                              color="primary"
                              size="small"
                              avatar={<Avatar>{user.user_id.charAt(0)}</Avatar>}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {user.report_count}
                          </TableCell>
                          <TableCell align="right">
                            {user.unique_patients}
                          </TableCell>
                          <TableCell align="right">
                            {user.report_types_uploaded}
                          </TableCell>
                          {/* <TableCell align="center">
                            <Tooltip title="View User Activity">
                              <IconButton size="small">
                                <Person fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell> */}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Deletion Analysis
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer component={Paper} elevation={0}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Report Type</TableCell>
                        <TableCell>Deleted By</TableCell>
                        <TableCell align="right">Total Deleted</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analyticsData.deletionAnalysis.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Chip
                              label={item.report_type}
                              size="small"
                              color="error"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{item.deleted_by || "System"}</TableCell>
                          <TableCell align="right">
                            {item.total_deleted}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 4 && (
        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Activity
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Timeline position="alternate">
                  {analyticsData.recentActivity.map((activity, index) => (
                    <TimelineItem key={index}>
                      <TimelineOppositeContent color="textSecondary">
                        {format(
                          new Date(activity.uploaded_at),
                          "MMM dd, HH:mm"
                        )}
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot
                          color={activity.is_deleted ? "error" : "primary"}
                        />
                        {index < analyticsData.recentActivity.length - 1 && (
                          <TimelineConnector />
                        )}
                      </TimelineSeparator>
                      <TimelineContent>
                        <Paper
                          elevation={3}
                          sx={{
                            p: 2,
                            borderLeft: activity.is_deleted
                              ? `4px solid ${theme.palette.error.main}`
                              : `4px solid ${theme.palette.primary.main}`,
                          }}
                        >
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="subtitle1">
                              {activity.report_name}
                            </Typography>
                            <Chip
                              label={activity.report_type}
                              size="small"
                              color={activity.is_deleted ? "error" : "primary"}
                            />
                          </Box>
                          <Typography variant="body2" color="textSecondary">
                            {activity.report_subtype || "No subtype"}
                          </Typography>
                          <Typography variant="body2">
                            Uploaded by User {activity.user_id}
                          </Typography>
                          {activity.is_deleted && (
                            <Box mt={1}>
                              <Typography variant="caption" color="error">
                                Deleted by User {activity.deleted_by} on{" "}
                                {format(
                                  new Date(activity.deleted_at),
                                  "MMM dd, HH:mm"
                                )}
                              </Typography>
                            </Box>
                          )}
                        </Paper>
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Dialog
        open={detailsDialog.open}
        onClose={closeDetailsDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Report Details</DialogTitle>
        <DialogContent>
          {detailsDialog.data && (
            <TableContainer>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>Report Type</TableCell>
                    <TableCell>
                      <Chip
                        label={detailsDialog.data.report_type}
                        color="primary"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Count</TableCell>
                    <TableCell>{detailsDialog.data.count}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Unique Patients</TableCell>
                    <TableCell>{detailsDialog.data.unique_patients}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetailsDialog}>Close</Button>
        </DialogActions>
      </Dialog>
      {error && (
        <Box textAlign="center" py={2}>
          <Typography variant="body1" color="error">
            {error}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AnalyticsDashboard;
